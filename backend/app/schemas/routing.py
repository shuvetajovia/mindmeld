from pydantic import BaseModel, Field
from typing import List, Optional

class RouteRequest(BaseModel):
    origin: str = Field(..., example="Guwahati")
    destination: str = Field(..., example="Kohima")
    alpha: float = Field(0.5, description="Hazard weight sensitivity parameter", ge=0.0, le=10.0)

class DetourStep(BaseModel):
    instruction: str
    distance_km: float
    estimated_time_mins: float
    risk_score: float
    segment_name: str

class SafeRouteResponse(BaseModel):
    origin: str
    destination: str
    total_distance_km: float
    average_risk: float
    status: str  # OPEN, CAUTION, BLOCKED
    waypoints: List[List[float]] = Field(..., description="Array of coordinates [latitude, longitude]")
    detour_steps: List[DetourStep]
    alternative_available: bool = False
