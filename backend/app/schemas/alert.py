from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class CAPArea(BaseModel):
    areaDesc: str = Field(..., description="Description of the affected area")
    polygon: Optional[str] = Field(None, description="Space-separated latitude,longitude pairs defining the polygon boundary")
    circle: Optional[str] = Field(None, description="Center coordinate and radius in km (e.g., '25.6,94.1 10.0')")

class CAPInfo(BaseModel):
    category: str = "Geo"
    event: str = "Landslide Early Warning"
    urgency: str = "Immediate"  # Immediate, Expected, Future, Past, Unknown
    severity: str = "Severe"    # Extreme, Severe, Moderate, Minor, Unknown
    certainty: str = "Likely"   # Observed, Likely, Possible, Unlikely, Unknown
    headline: str
    description: str
    instruction: Optional[str] = None
    senderName: str = "District Disaster Management Authority (DDMA)"
    area: List[CAPArea]

class CAPAlert(BaseModel):
    identifier: str
    sender: str = "ews@ner-landslide.gov.in"
    sent: str  # ISO 8601 formatted time
    status: str = "Actual"  # Actual, Exercise, System, Test, Draft
    msgType: str = "Alert"  # Alert, Update, Cancel, Ack, Error
    scope: str = "Public"    # Public, Restricted, Private
    info: List[CAPInfo]
