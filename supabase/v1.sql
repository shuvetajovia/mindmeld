-- Supabase Migration v1.sql
-- Core EWS Tables with DOUBLE PRECISION coordinates

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SENSOR NODES
CREATE TABLE IF NOT EXISTS sensor_nodes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    soil_moisture DOUBLE PRECISION DEFAULT 0.0,
    rain_24h_obs DOUBLE PRECISION DEFAULT 0.0,
    rain_48h_prior DOUBLE PRECISION DEFAULT 0.0,
    rain_72h_prior DOUBLE PRECISION DEFAULT 0.0,
    rain_7d_prior DOUBLE PRECISION DEFAULT 0.0,
    api_7d DOUBLE PRECISION DEFAULT 0.0,
    r24_seasonal_anom DOUBLE PRECISION DEFAULT 0.0,
    api_seasonal_anom DOUBLE PRECISION DEFAULT 0.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ROAD SEGMENTS
CREATE TABLE IF NOT EXISTS road_segments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    section VARCHAR(100) NOT NULL,
    geometry TEXT NOT NULL, -- Stored as GeoJSON string or path coordinates
    length_km DOUBLE PRECISION NOT NULL,
    slope DOUBLE PRECISION DEFAULT 0.0,
    elevation DOUBLE PRECISION DEFAULT 0.0,
    aspect_sin DOUBLE PRECISION DEFAULT 0.0,
    aspect_cos DOUBLE PRECISION DEFAULT 0.0,
    curvature DOUBLE PRECISION DEFAULT 0.0,
    dist_to_road_km DOUBLE PRECISION DEFAULT 0.0,
    risk_probability DOUBLE PRECISION DEFAULT 0.0,
    risk_score DOUBLE PRECISION DEFAULT 1.0,
    status VARCHAR(20) DEFAULT 'OPEN',
    primary_shap_trigger VARCHAR(100) DEFAULT 'RAIN_DEPTH_24H',
    sensor_node_id VARCHAR(50) REFERENCES sensor_nodes(id) ON DELETE SET NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CROWDSOURCED REPORTS
CREATE TABLE IF NOT EXISTS field_crowdsource_reports (
    id SERIAL PRIMARY KEY,
    reporter_name VARCHAR(100),
    phone VARCHAR(20),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    photo_path VARCHAR(255),
    description TEXT,
    category VARCHAR(50) NOT NULL,
    crack_length DOUBLE PRECISION DEFAULT 0.0,
    crack_depth DOUBLE PRECISION DEFAULT 0.0,
    settlement_proximity VARCHAR(50),
    severity VARCHAR(30) DEFAULT 'MODERATE',
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ACTIVE CAP ALERTS
CREATE TABLE IF NOT EXISTS cap_alerts (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(100) UNIQUE NOT NULL,
    sender VARCHAR(100) NOT NULL,
    sent TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'Actual',
    msg_type VARCHAR(30) DEFAULT 'Alert',
    scope VARCHAR(30) DEFAULT 'Public',
    category VARCHAR(50) DEFAULT 'Met',
    event VARCHAR(100) NOT NULL,
    urgency VARCHAR(30) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    certainty VARCHAR(30) NOT NULL,
    headline TEXT NOT NULL,
    description TEXT,
    instruction TEXT,
    area_desc TEXT NOT NULL
);
