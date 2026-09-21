from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class SensorTelemetryInput(BaseModel):
    sensor_id: str = Field(..., example="NODE_NH10_MANGAN")
    soil_moisture: float = Field(..., description="Soil volumetric water content (%)", ge=0.0, le=100.0)
    rain_24h_obs: float = Field(..., description="Observed rainfall in past 24 hours (mm)", ge=0.0)
    rain_48h_prior: float = Field(0.0, ge=0.0)
    rain_72h_prior: float = Field(0.0, ge=0.0)
    rain_7d_prior: float = Field(0.0, ge=0.0)
    api_7d: float = Field(0.0, description="7-day antecedent precipitation index (mm)", ge=0.0)
    r24_seasonal_anom: float = Field(0.0, description="Seasonal anomaly for 24h rainfall (mm)")
    api_seasonal_anom: float = Field(0.0, description="Seasonal anomaly for 7d API (mm)")

class SensorNodeStatus(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    soil_moisture: float
    rain_24h_obs: float
    last_updated: datetime

    class Config:
        from_attributes = True

class TelemetryHistoryItem(BaseModel):
    timestamp: datetime
    soil_moisture: float
    rain_24h_obs: float
