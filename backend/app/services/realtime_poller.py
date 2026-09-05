import asyncio
import os
import random
import logging
import datetime
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.db.session import SessionLocal, IS_POSTGRES
from backend.app.models.spatial import RoadSegment, SensorNode
from backend.app.services.ml_engine import ml_engine

logger = logging.getLogger(__name__)

# Resolve base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATASET_PATH = os.path.join(BASE_DIR, "two_tier_landslide_ews_dataset.csv")

# Global stop flag for background task
_POLLER_RUNNING = False

def get_nearest_sensor(segment: RoadSegment, sensors: list) -> SensorNode:
    """
    Returns the geographically closest sensor node to a given road segment.
    Since segments have coordinates, we use a simple distance to the first coordinate point.
    """
    # Parse segment coordinates
    import json
    coords = []
    if IS_POSTGRES:
        from geoalchemy2.shape import to_shape
        try:
            shape = to_shape(segment.geometry)
            coords = [[float(p[1]), float(p[0])] for p in shape.coords]
        except Exception:
            pass
    else:
        try:
            coords = json.loads(segment.geometry)
        except Exception:
            pass

    if not coords or not sensors:
        # Fallback: return first sensor or None
        return sensors[0] if sensors else None

    # Middle point of segment
    mid_lat = coords[len(coords) // 2][0]
    mid_lon = coords[len(coords) // 2][1]

    # Find closest sensor
    closest_sensor = None
    min_dist = float('inf')
    for sensor in sensors:
        dist = ((sensor.latitude - mid_lat)**2 + (sensor.longitude - mid_lon)**2)**0.5
        if dist < min_dist:
            min_dist = dist
            closest_sensor = sensor

    return closest_sensor

def update_sensor_telemetry_and_segment_risks(db: Session):
    """
    Core function that polls weather/sensor values, runs machine learning prediction,
    and updates segment risk indices in the database.
    """
    try:
        # 1. Fetch all sensors and segments
        sensors = db.query(SensorNode).all()
        segments = db.query(RoadSegment).all()

        if not sensors or not segments:
            logger.warning("No sensors or segments found in the database. Skipping update.")
            return

        # 2. Check if dataset exists to read realistic data
        df = None
        if os.path.exists(DATASET_PATH):
            try:
                df = pd.read_csv(DATASET_PATH)
            except Exception as e:
                logger.error(f"Error reading dataset csv for telemetry: {str(e)}")

        # 3. Update each sensor node with simulated/sampled telemetry
        for sensor in sensors:
            if df is not None and not df.empty:
                # Sample a random historical landslide trigger row
                row = df.sample(1).iloc[0]
                
                sensor.soil_moisture = float(row.get("soil_moisture", random.uniform(20.0, 75.0)))
                sensor.rain_24h_obs = float(row.get("rain_24h_obs", random.uniform(0.0, 150.0)))
                sensor.rain_48h_prior = float(row.get("rain_48h_prior", random.uniform(0.0, 200.0)))
                sensor.rain_72h_prior = float(row.get("rain_72h_prior", random.uniform(0.0, 250.0)))
                sensor.rain_7d_prior = float(row.get("rain_7d_prior", random.uniform(0.0, 400.0)))
                sensor.api_7d = float(row.get("api_7d", random.uniform(10.0, 300.0)))
                sensor.r24_seasonal_anom = float(row.get("r24_seasonal_anom", random.uniform(-10.0, 80.0)))
                sensor.api_seasonal_anom = float(row.get("api_seasonal_anom", random.uniform(-10.0, 100.0)))
            else:
                # Fallback: pure random weather simulation
                sensor.soil_moisture = random.uniform(15.0, 80.0)
                sensor.rain_24h_obs = random.uniform(0.0, 120.0)
                sensor.rain_48h_prior = random.uniform(0.0, 150.0)
                sensor.rain_72h_prior = random.uniform(0.0, 180.0)
                sensor.rain_7d_prior = random.uniform(5.0, 300.0)
                sensor.api_7d = random.uniform(10.0, 200.0)
                sensor.r24_seasonal_anom = random.uniform(-5.0, 50.0)
                sensor.api_seasonal_anom = random.uniform(-5.0, 60.0)
            
            sensor.last_updated = datetime.datetime.utcnow()
            db.add(sensor)

        # Flush sensor updates so they are available in DB session
        db.flush()

        # 4. Predict risk for each road segment based on closest sensor's dynamic meteorological data
        for seg in segments:
            closest_sensor = get_nearest_sensor(seg, sensors)
            if not closest_sensor:
                continue

            static_features = {
                "slope": seg.slope,
                "elevation": seg.elevation,
                "aspect_sin": seg.aspect_sin,
                "aspect_cos": seg.aspect_cos,
                "curvature": seg.curvature,
                "dist_to_road_km": seg.dist_to_road_km
            }

            dynamic_features = {
                "rain_24h_obs": closest_sensor.rain_24h_obs,
                "rain_48h_prior": closest_sensor.rain_48h_prior,
                "rain_72h_prior": closest_sensor.rain_72h_prior,
                "rain_7d_prior": closest_sensor.rain_7d_prior,
                "api_7d": closest_sensor.api_7d,
                "r24_seasonal_anom": closest_sensor.r24_seasonal_anom,
                "api_seasonal_anom": closest_sensor.api_seasonal_anom
            }

            # Run ML prediction pipeline
            pred = ml_engine.predict_risk(static_features, dynamic_features)

            # Update segment properties
            seg.risk_probability = pred["fused_prob"]
            seg.risk_score = float(pred["risk_score"])
            
            # Map status
            # Orange/Red alert (Risk >= 7 / Prob >= 0.65) flags segment as BLOCKED
            if seg.risk_score >= 7.0 or seg.risk_probability >= 0.65:
                seg.status = "BLOCKED"
            elif seg.risk_score >= 4.0:
                seg.status = "CAUTION"
            else:
                seg.status = "OPEN"
                
            seg.last_updated = datetime.datetime.utcnow()
            db.add(seg)

        db.commit()
        logger.info("Real-time telemetry and road hazard risk scores updated successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error in background update loop: {str(e)}")

async def start_realtime_polling_loop(interval_seconds: int = 15):
    """
    Main polling loop that fires every interval_seconds.
    Runs until the global stop flag is set to false.
    """
    global _POLLER_RUNNING
    _POLLER_RUNNING = True
    logger.info(f"Starting Real-Time Ingestion Telemetry Polling loop (interval: {interval_seconds}s)...")

    while _POLLER_RUNNING:
        db = SessionLocal()
        try:
            update_sensor_telemetry_and_segment_risks(db)
        except Exception as e:
            logger.error(f"Fatal error in telemetry updater: {str(e)}")
        finally:
            db.close()
        
        await asyncio.sleep(interval_seconds)

def stop_realtime_polling_loop():
    """
    Stops the background polling loop.
    """
    global _POLLER_RUNNING
    _POLLER_RUNNING = False
    logger.info("Stopped Real-Time Telemetry Ingestion Poller.")
