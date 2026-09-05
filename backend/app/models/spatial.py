import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from backend.app.db.session import Base, IS_POSTGRES

# Conditional import for GeoAlchemy2 if using PostGIS
if IS_POSTGRES:
    from geoalchemy2 import Geometry
    geometry_type = Geometry("LINESTRING", srid=4326)
else:
    geometry_type = Text  # Will store GeoJSON string or WKT representation in SQLite

class RoadSegment(Base):
    __tablename__ = "road_segments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), nullable=False, index=True)  # e.g., "NH-29", "NH-10"
    section = Column(String(100), nullable=False)           # e.g., "Siliguri - Gangtok"
    geometry = Column(geometry_type, nullable=False)        # LineString geometry
    length_km = Column(Float, nullable=False)
    
    # Static susceptibility features
    slope = Column(Float, default=0.0)
    elevation = Column(Float, default=0.0)
    aspect_sin = Column(Float, default=0.0)
    aspect_cos = Column(Float, default=0.0)
    curvature = Column(Float, default=0.0)
    dist_to_road_km = Column(Float, default=0.0)
    
    # Early Warning status & predictions
    risk_probability = Column(Float, default=0.0)
    risk_score = Column(Float, default=1.0)                 # 1 to 10
    status = Column(String(20), default="OPEN")              # OPEN, CAUTION, BLOCKED
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class SensorNode(Base):
    __tablename__ = "sensor_nodes"

    id = Column(String(50), primary_key=True, index=True)    # IoT node ID
    name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Dynamic meteorological features
    soil_moisture = Column(Float, default=0.0)              # In-situ sensor
    rain_24h_obs = Column(Float, default=0.0)
    rain_48h_prior = Column(Float, default=0.0)
    rain_72h_prior = Column(Float, default=0.0)
    rain_7d_prior = Column(Float, default=0.0)
    api_7d = Column(Float, default=0.0)
    r24_seasonal_anom = Column(Float, default=0.0)
    api_seasonal_anom = Column(Float, default=0.0)
    
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
