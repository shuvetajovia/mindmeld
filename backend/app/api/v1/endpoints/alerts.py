import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.models.spatial import RoadSegment, SensorNode
from backend.app.services.realtime_poller import get_nearest_sensor
from backend.app.schemas.alert import CAPAlert, CAPInfo, CAPArea
from backend.app.services.cap_dispatcher import generate_cap_xml, generate_cap_json
from backend.app.services.sms_gateway import dispatch_sms_warnings

router = APIRouter()

def build_cap_alert(segment: RoadSegment, db: Session) -> CAPAlert:
    """Helper to assemble a CAPAlert object from a high-risk RoadSegment"""
    sensors = db.query(SensorNode).all()
    closest_sensor = get_nearest_sensor(segment, sensors)
    
    sensor_txt = ""
    if closest_sensor:
        sensor_txt = f" Associated monitoring IoT node: {closest_sensor.name} (Soil moisture: {closest_sensor.soil_moisture:.1f}%)."

    # Extract coordinates to represent affected line segment
    import json
    from backend.app.services.routing_engine import get_segment_coords
    coords = get_segment_coords(segment)
    poly_str = " ".join([f"{lat},{lon}" for lat, lon in coords]) if coords else None

    # Alert severity mapping
    severity = "Severe" if segment.risk_score < 9.0 else "Extreme"
    urgency = "Immediate"

    headline = f"Landslide Alert: Orange warning issued for {segment.name} ({segment.section})"
    description = (
        f"A landslide warning level of {segment.risk_score:.1f}/10 has been computed for the road corridor section "
        f"{segment.name} ({segment.section}). The predicted 24h failure probability is {segment.risk_probability:.2%}.{sensor_txt}"
    )
    instruction = (
        "ALERT: Citizens are advised to suspend all non-essential travel along this corridor segment. "
        "NDRF search-and-rescue teams have been pre-positioned. Utilize the hazard-aware route planner to select a safe detour."
    )

    cap_info = CAPInfo(
        category="Geo",
        event="Landslide Early Warning",
        urgency=urgency,
        severity=severity,
        certainty="Likely",
        headline=headline,
        description=description,
        instruction=instruction,
        area=[
            CAPArea(
                areaDesc=f"Highway corridor {segment.name} - Section {segment.section}",
                polygon=poly_str
            )
        ]
    )

    return CAPAlert(
        identifier=f"ALERT-SEG-{segment.id}-{int(datetime.datetime.utcnow().timestamp())}",
        sent=datetime.datetime.utcnow().isoformat() + "+05:30",
        info=[cap_info]
    )

@router.get("/active")
def get_active_alerts(db: Session = Depends(get_db)):
    """
    Returns active alerts (Risk score >= 7) mapped to CAP JSON.
    """
    high_risk_segments = db.query(RoadSegment).filter(RoadSegment.risk_score >= 7.0).all()
    
    alerts_list = []
    for seg in high_risk_segments:
        cap_alert = build_cap_alert(seg, db)
        alerts_list.append(generate_cap_json(cap_alert))
        
    return {"alerts": alerts_list, "count": len(alerts_list)}

@router.get("/{segment_id}/cap.xml")
def get_cap_xml_alert(segment_id: int, db: Session = Depends(get_db)):
    """
    Generates and returns the official OASIS CAP v1.2 XML early warning alert.
    """
    segment = db.query(RoadSegment).filter(RoadSegment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
        
    if segment.risk_score < 7.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OASIS CAP alerts are only available for segments in high-risk zones (Risk >= 7.0)."
        )
        
    cap_alert = build_cap_alert(segment, db)
    xml_content = generate_cap_xml(cap_alert)
    
    return Response(content=xml_content, media_type="application/xml")

@router.post("/{segment_id}/sms")
def trigger_sms_broadcast(segment_id: int, language: str = "English", db: Session = Depends(get_db)):
    """
    Triggers simulated emergency warning SMS messages to residents near a high-risk corridor segment.
    """
    segment = db.query(RoadSegment).filter(RoadSegment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
        
    res = dispatch_sms_warnings(
        segment_name=f"{segment.name} ({segment.section})",
        risk_score=int(segment.risk_score),
        language=language
    )
    return res
