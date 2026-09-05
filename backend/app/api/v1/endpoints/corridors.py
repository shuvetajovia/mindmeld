from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.models.spatial import RoadSegment
from backend.app.services.routing_engine import get_segment_coords, seed_road_networks

router = APIRouter()

@router.get("/status")
def get_corridor_status(db: Session = Depends(get_db)):
    """
    Returns the real-time operational status (OPEN, CAUTION, BLOCKED)
    and coordinate geometry line tracks for key national highways in the NER.
    """
    # Ensure network exists in database
    seed_road_networks(db)

    segments = db.query(RoadSegment).all()
    corridors_summary = {}

    for seg in segments:
        name = seg.name
        if name not in corridors_summary:
            corridors_summary[name] = {
                "name": name,
                "sections": [],
                "status": "OPEN",
                "max_risk": 1.0,
                "average_risk": 0.0,
                "length_km": 0.0
            }
            
        summary = corridors_summary[name]
        
        # Determine aggregate status (if any section is blocked, highway is caution/blocked)
        if seg.status == "BLOCKED":
            summary["status"] = "BLOCKED"
        elif seg.status == "CAUTION" and summary["status"] != "BLOCKED":
            summary["status"] = "CAUTION"
            
        summary["length_km"] += seg.length_km
        summary["max_risk"] = max(summary["max_risk"], seg.risk_score)
        
        summary["sections"].append({
            "id": seg.id,
            "section": seg.section,
            "length_km": seg.length_km,
            "risk_score": round(seg.risk_score, 1),
            "risk_probability": round(seg.risk_probability, 3),
            "status": seg.status,
            "coordinates": get_segment_coords(seg)
        })

    # Calculate average risk and clean up dictionary
    result = []
    for k, v in corridors_summary.items():
        total_risk = sum([s["risk_score"] for s in v["sections"]])
        v["average_risk"] = round(total_risk / len(v["sections"]), 1) if v["sections"] else 1.0
        v["length_km"] = round(v["length_km"], 1)
        result.append(v)

    return result

@router.post("/{segment_id}/override")
def override_segment_status(segment_id: int, status_override: str, db: Session = Depends(get_db)):
    """
    Manual override endpoint for district administrators to manually block/clear
    road segments during field emergencies.
    """
    if status_override not in ["OPEN", "CAUTION", "BLOCKED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be one of: OPEN, CAUTION, BLOCKED"
        )
        
    segment = db.query(RoadSegment).filter(RoadSegment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Road segment not found")
        
    segment.status = status_override
    # Adjust risk score matching override to keep graph weights consistent
    if status_override == "BLOCKED":
        segment.risk_score = 9.5
        segment.risk_probability = 0.90
    elif status_override == "CAUTION":
        segment.risk_score = 5.0
        segment.risk_probability = 0.40
    else:
        segment.risk_score = 1.5
        segment.risk_probability = 0.05
        
    db.commit()
    
    return {
        "success": True,
        "segment_id": segment.id,
        "new_status": segment.status,
        "risk_score": segment.risk_score
    }
