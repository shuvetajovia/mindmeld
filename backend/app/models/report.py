import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from backend.app.db.session import Base

class FieldCrowdsourceReport(Base):
    __tablename__ = "field_crowdsource_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    reporter_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    photo_path = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
