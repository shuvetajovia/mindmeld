import random
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.models.spatial import SensorNode, RoadSegment
from backend.app.schemas.telemetry import SensorTelemetryInput, SensorNodeStatus
from backend.app.services.routing_engine import seed_road_networks

router = APIRouter()

@router.get("/nodes")
def get_sensor_nodes(db: Session = Depends(get_db)):
    """Returns a list of all deployed IoT telemetry nodes and weather grid nodes"""
    # Ensure seeded database
    seed_road_networks(db)
    
    nodes = db.query(SensorNode).all()
    return nodes

@router.get("/nodes/{sensor_id}/history")
def get_node_telemetry_history(sensor_id: str, db: Session = Depends(get_db)):
    """
    Returns 24h historical telemetry grid values for charts and monitoring.
    Generates realistic historical series based on the current live values.
    """
    node = db.query(SensorNode).filter(SensorNode.id == sensor_id).first()
    if not node:
        raise HTTPException(
            status_code=404,
            detail=f"Sensor node with ID {sensor_id} not found."
        )

    # Generate a mock 24h series ending at current time
    history = []
    base_moisture = node.soil_moisture
    base_rain = node.rain_24h_obs
    
    now = datetime.datetime.utcnow()
    for hour in range(24):
        time_slot = now - datetime.timedelta(hours=23-hour)
        # Random walk for soil moisture and rain accumulation
        moisture_val = max(10.0, min(95.0, base_moisture + random.uniform(-2.0, 2.0)))
        rain_val = max(0.0, base_rain * (hour / 24.0) + random.uniform(-1.0, 1.5))
        
        history.append({
            "timestamp": time_slot,
            "soil_moisture": round(moisture_val, 1),
            "rain_24h_obs": round(rain_val, 1)
        })

    return {
        "sensor_id": node.id,
        "sensor_name": node.name,
        "latitude": node.latitude,
        "longitude": node.longitude,
        "history": history
    }

@router.post("/update")
def ingest_iot_telemetry(payload: SensorTelemetryInput, db: Session = Depends(get_db)):
    """
    Direct ingestion endpoint for physical IoT devices and IMD meteorological feeds.
    Pushes parameters directly to database and triggers segment risk recalculations.
    """
    node = db.query(SensorNode).filter(SensorNode.id == payload.sensor_id).first()
    if not node:
        # Create a new sensor node dynamically
        node = SensorNode(id=payload.sensor_id, name=f"Dynamic Node {payload.sensor_id}", latitude=26.0, longitude=92.0)
        db.add(node)
        
    # Update properties
    node.soil_moisture = payload.soil_moisture
    node.rain_24h_obs = payload.rain_24h_obs
    node.rain_48h_prior = payload.rain_48h_prior
    node.rain_72h_prior = payload.rain_72h_prior
    node.rain_7d_prior = payload.rain_7d_prior
    node.api_7d = payload.api_7d
    node.r24_seasonal_anom = payload.r24_seasonal_anom
    node.api_seasonal_anom = payload.api_seasonal_anom
    node.last_updated = datetime.datetime.utcnow()
    
    # Recalculate risks for segments that are linked to this sensor node
    db.flush()
    
    segments = db.query(RoadSegment).all()
    from backend.app.services.realtime_poller import get_nearest_sensor
    from backend.app.services.ml_engine import ml_engine
    
    sensors = db.query(SensorNode).all()
    
    updated_count = 0
    for seg in segments:
        closest = get_nearest_sensor(seg, sensors)
        if closest and closest.id == node.id:
            # Recalculate risk
            static_features = {
                "slope": seg.slope, "elevation": seg.elevation, "aspect_sin": seg.aspect_sin,
                "aspect_cos": seg.aspect_cos, "curvature": seg.curvature, "dist_to_road_km": seg.dist_to_road_km
            }
            dynamic_features = {
                "rain_24h_obs": node.rain_24h_obs, "rain_48h_prior": node.rain_48h_prior,
                "rain_72h_prior": node.rain_72h_prior, "rain_7d_prior": node.rain_7d_prior,
                "api_7d": node.api_7d, "r24_seasonal_anom": node.r24_seasonal_anom,
                "api_seasonal_anom": node.api_seasonal_anom
            }
            pred = ml_engine.predict_risk(static_features, dynamic_features)
            seg.risk_probability = pred["fused_prob"]
            seg.risk_score = float(pred["risk_score"])
            
            if seg.risk_score >= 7.0 or seg.risk_probability >= 0.65:
                seg.status = "BLOCKED"
            elif seg.risk_score >= 4.0:
                seg.status = "CAUTION"
            else:
                seg.status = "OPEN"
                
            seg.last_updated = datetime.datetime.utcnow()
            db.add(seg)
            updated_count += 1
            
    db.commit()
    
    return {
        "success": True,
        "message": f"Telemetry ingested for node {node.id}. Recalculated risk for {updated_count} segments."
    }
