-- Supabase Database Schema
-- NER Unified AI Landslide Early Warning & Regional Resilience Grid
-- Created: 2026-08-24 IST

-- Enable UUID extension if using PostgreSQL/Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. SENSOR NODES
-- Stores dynamic meteorological readings and telemetry from IoT field stations
-- =========================================================================
CREATE TABLE IF NOT EXISTS sensor_nodes (
    id VARCHAR(50) PRIMARY KEY,                         -- Unique ID, e.g., 'SN-MEG-KH-01'
    name VARCHAR(100) NOT NULL,                        -- Human readable name, e.g., 'Cherrapunji Tribal Slopes'
    latitude DECIMAL(10, 7) NOT NULL CHECK (latitude BETWEEN 21.0 AND 30.0), -- Bound to NER region
    longitude DECIMAL(10, 7) NOT NULL CHECK (longitude BETWEEN 87.0 AND 98.0),
    
    -- Dynamic Meteorological & Sensor Metrics
    soil_moisture DECIMAL(5, 2) DEFAULT 0.0 CHECK (soil_moisture BETWEEN 0.0 AND 100.0), -- Volumetric Water Content %
    rain_24h_obs DECIMAL(6, 2) DEFAULT 0.0,            -- Observed rainfall in last 24 hours (mm)
    rain_48h_prior DECIMAL(6, 2) DEFAULT 0.0,          -- Prior rain depth (mm)
    rain_72h_prior DECIMAL(6, 2) DEFAULT 0.0,          -- Prior rain depth (mm)
    rain_7d_prior DECIMAL(6, 2) DEFAULT 0.0,           -- Prior rain depth (mm)
    api_7d DECIMAL(6, 2) DEFAULT 0.0,                  -- 7-Day Antecedent Precipitation Index
    r24_seasonal_anom DECIMAL(6, 2) DEFAULT 0.0,       -- 24h deviation from seasonal historical mean (mm)
    api_seasonal_anom DECIMAL(6, 2) DEFAULT 0.0,       -- 7d API deviation from seasonal historical mean (mm)
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sensor_nodes_coords ON sensor_nodes (latitude, longitude);

-- =========================================================================
-- 2. ROAD SEGMENTS (HIGHWAY CORRIDORS)
-- Stores physical slope attributes and computed neural failure hazards
-- =========================================================================
CREATE TABLE IF NOT EXISTS road_segments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,                         -- Highway name/tag, e.g., 'NH-44', 'NH-10'
    section VARCHAR(100) NOT NULL,                     -- Section title, e.g., 'Shillong - Silchar Cut Slope'
    geometry TEXT NOT NULL,                            -- Linestring JSON array of coordinates or WKT text
    length_km DECIMAL(6, 2) NOT NULL,                  -- Segment length in kilometers
    
    -- Static Geomorphic Susceptibility Features
    slope DECIMAL(4, 2) DEFAULT 0.0,                   -- Mean slope angle in degrees (0 - 90)
    elevation DECIMAL(6, 2) DEFAULT 0.0,               -- Elevation above sea level in meters
    aspect_sin DECIMAL(5, 4) DEFAULT 0.0,              -- Sine of slope orientation
    aspect_cos DECIMAL(5, 4) DEFAULT 0.0,              -- Cosine of slope orientation
    curvature DECIMAL(6, 4) DEFAULT 0.0,               -- Curvature rate of terrain
    dist_to_road_km DECIMAL(5, 3) DEFAULT 0.0,         -- Proximity from critical infrastructure cutting
    
    -- Real-time AI early warning metrics
    risk_probability DECIMAL(5, 4) DEFAULT 0.0,        -- Calibrated likelihood of failure (0.0 to 1.0)
    risk_score DECIMAL(3, 1) DEFAULT 1.0,              -- Standarized 1 - 10 risk rating
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CAUTION', 'BLOCKED')),
    primary_shap_trigger VARCHAR(100) DEFAULT 'RAIN_DEPTH_24H',
    sensor_node_id VARCHAR(50) REFERENCES sensor_nodes(id) ON DELETE SET NULL,
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_road_segments_name ON road_segments (name);

-- =========================================================================
-- 3. CROWDSOURCED FIELD INCIDENTS
-- Citizens and field officers upload physical slope observations & alerts
-- =========================================================================
CREATE TABLE IF NOT EXISTS field_crowdsource_reports (
    id SERIAL PRIMARY KEY,
    reporter_name VARCHAR(100),
    phone VARCHAR(20),
    latitude DECIMAL(10, 7) NOT NULL CHECK (latitude BETWEEN 21.0 AND 30.0),
    longitude DECIMAL(10, 7) NOT NULL CHECK (longitude BETWEEN 87.0 AND 98.0),
    photo_path VARCHAR(255),                            -- Link to Supabase bucket file storage
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Tension Crack', 'Slope Slump', 'Rockfall', 'Road Subsidence', 'Mudflow')),
    crack_length DECIMAL(6, 2) DEFAULT 0.0,            -- Measured tension crack length in meters
    crack_depth DECIMAL(6, 2) DEFAULT 0.0,             -- Measured tension crack depth in meters
    settlement_proximity VARCHAR(50),                  -- Tag, e.g., '<50m', '50m-200m', '>200m'
    
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_verification ON field_crowdsource_reports (verified, created_at DESC);

-- =========================================================================
-- 4. ACTIVE COMMON ALERTING PROTOCOL (CAP) BROADCASTS
-- Integrates regional hazard warnings with administrative disaster rooms
-- =========================================================================
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
    severity VARCHAR(30) NOT NULL,                     -- e.g., 'Minor', 'Moderate', 'Severe', 'Extreme'
    certainty VARCHAR(30) NOT NULL,
    headline TEXT NOT NULL,
    description TEXT,
    instruction TEXT,
    area_desc TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_sent ON cap_alerts (sent DESC);
