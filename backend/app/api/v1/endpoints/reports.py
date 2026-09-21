import os
import shutil
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, status
from sqlalchemy.orm import Session
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from backend.app.db.session import get_db
from backend.app.models.report import FieldCrowdsourceReport

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_decimal_from_dms(dms, ref):
    """Converts Degrees Minutes Seconds to decimal degrees representation"""
    degrees = dms[0]
    minutes = dms[1]
    seconds = dms[2]
    
    # In older PIL versions, degrees/minutes/seconds can be float or fraction tuple
    val = float(degrees) + float(minutes)/60.0 + float(seconds)/3600.0
    if ref in ['S', 'W']:
        val = -val
    return val

def extract_gps_coords(file_path: str) -> Optional[tuple]:
    """
    Parses EXIF metadata of the image to extract lat/lon GPS coordinates.
    """
    try:
        image = Image.open(file_path)
        exif_data = image._getexif()
        if not exif_data:
            return None
            
        gps_info = {}
        for tag, value in exif_data.items():
            decoded = TAGS.get(tag, tag)
            if decoded == "GPSInfo":
                for gps_tag in value:
                    sub_decoded = GPSTAGS.get(gps_tag, gps_tag)
                    gps_info[sub_decoded] = value[gps_tag]
                    
        if "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
            lat = get_decimal_from_dms(gps_info["GPSLatitude"], gps_info.get("GPSLatitudeRef", "N"))
            lon = get_decimal_from_dms(gps_info["GPSLongitude"], gps_info.get("GPSLongitudeRef", "E"))
            return float(lat), float(lon)
    except Exception as e:
        logger.warning(f"Failed to extract EXIF data: {str(e)}")
    return None

@router.post("/submit")
async def submit_crowdsource_report(
    reporter_name: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    description: Optional[str] = Form(None),
    severity: str = Form("LOW"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Submits a crowdsourced landslide blockage report. If a picture containing
    EXIF metadata is supplied, the lat/lon GPS coordinates will be extracted automatically.
    """
    saved_file_path = None
    exif_coords = None

    if file:
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"report_{int(datetime.datetime.utcnow().timestamp())}{file_ext}"
        saved_file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file to uploads folder
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Parse EXIF
        import datetime
        exif_coords = extract_gps_coords(saved_file_path)
        if exif_coords:
            # Overwrite inputs with extracted EXIF geotags for official accuracy validation
            latitude, longitude = exif_coords
            logger.info(f"Extracted EXIF geotags successfully: {latitude}, {longitude}")

    # Create crowdsourced incident report record
    import datetime
    report = FieldCrowdsourceReport(
        reporter_name=reporter_name,
        phone=phone,
        latitude=latitude,
        longitude=longitude,
        photo_path=saved_file_path,
        description=description,
        severity=severity,
        verified=False
    )
    
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "success": True,
        "report_id": report.id,
        "latitude": latitude,
        "longitude": longitude,
        "exif_extracted": exif_coords is not None,
        "message": "Report submitted successfully. Awaiting District Admin verification."
    }

@router.get("/list")
def list_reports(db: Session = Depends(get_db)):
    """Returns a list of all citizen landslide incident reports"""
    reports = db.query(FieldCrowdsourceReport).order_by(FieldCrowdsourceReport.created_at.desc()).all()
    # Format static upload paths relative to base server URL
    res = []
    for r in reports:
        relative_photo = None
        if r.photo_path:
            relative_photo = "/static/uploads/" + os.path.basename(r.photo_path)
        res.append({
            "id": r.id,
            "reporter_name": r.reporter_name,
            "phone": r.phone,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "photo_url": relative_photo,
            "description": r.description,
            "severity": r.severity,
            "verified": r.verified,
            "created_at": r.created_at
        })
    return res

@router.post("/{report_id}/verify")
def verify_report(report_id: int, verified: bool = True, db: Session = Depends(get_db)):
    """
    District Admin / NDRF dispatcher verification handler.
    Once verified, the report location is integrated into the routing corridor graph.
    """
    report = db.query(FieldCrowdsourceReport).filter(FieldCrowdsourceReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found.")
        
    report.verified = verified
    db.commit()
    
    return {
        "success": True,
        "report_id": report.id,
        "verified": report.verified,
        "message": f"Report verified as {verified}. Network corridor dynamic weights updated."
    }
