from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.models.spatial import RoadSegment
from backend.app.services.ml_engine import ml_engine
from backend.app.services.realtime_poller import get_nearest_sensor
from backend.app.models.spatial import SensorNode

router = APIRouter()

@router.post("/predict")
def predict_hazard_risk(static_features: dict, dynamic_features: dict):
    """
    Directly runs the two-tier risk prediction and meta-calibration for custom values.
    """
    try:
        res = ml_engine.predict_risk(static_features, dynamic_features)
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inference execution failed: {str(e)}"
        )

@router.post("/explain")
def explain_hazard_trigger(dynamic_features: dict):
    """
    Returns SHAP value explanations for meteorological trigger inputs.
    """
    try:
        shap_explanation = ml_engine.explain_trigger(dynamic_features)
        return {"shap_values": shap_explanation}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SHAP explanation failed: {str(e)}"
        )

@router.get("/segment/{segment_id}")
def get_segment_forecast(segment_id: int, db: Session = Depends(get_db)):
    """
    Computes and returns the 24h Early Warning risk prediction and SHAP explanation
    for a specific road segment using the nearest live sensor telemetry.
    """
    segment = db.query(RoadSegment).filter(RoadSegment.id == segment_id).first()
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Road segment with ID {segment_id} not found."
        )

    sensors = db.query(SensorNode).all()
    closest_sensor = get_nearest_sensor(segment, sensors)
    
    if not closest_sensor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No sensor telemetry node available to compute trigger."
        )

    static_features = {
        "slope": segment.slope,
        "elevation": segment.elevation,
        "aspect_sin": segment.aspect_sin,
        "aspect_cos": segment.aspect_cos,
        "curvature": segment.curvature,
        "dist_to_road_km": segment.dist_to_road_km
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

    # Run predictions and SHAP explainers
    pred = ml_engine.predict_risk(static_features, dynamic_features)
    shap_vals = ml_engine.explain_trigger(dynamic_features)

    return {
        "segment_id": segment.id,
        "segment_name": segment.name,
        "section": segment.section,
        "forecast": pred,
        "sensor_node": closest_sensor.id,
        "sensor_name": closest_sensor.name,
        "shap_values": shap_vals,
        "telemetry": dynamic_features
    }
