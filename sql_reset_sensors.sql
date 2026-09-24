-- ============================================================
-- MINDMELD NER LANDSLIDE EWS — FULL DATABASE RESET
-- Drops ALL tables, recreates EWS schema, seeds realistic data
-- Paste this ENTIRE script into Supabase SQL Editor → RUN
-- ============================================================

-- ═══════════════════════════════════════════════════
-- STEP 1: DROP EVERYTHING
-- ═══════════════════════════════════════════════════
DROP FUNCTION IF EXISTS simulate_sensor_drift() CASCADE;
DROP FUNCTION IF EXISTS get_nearby_users_for_alert(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) CASCADE;
DROP FUNCTION IF EXISTS get_active_alerts() CASCADE;

DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS fees CASCADE;
DROP TABLE IF EXISTS marks CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS student_attendance CASCADE;
DROP TABLE IF EXISTS timetable CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS income_expenses CASCADE;
DROP TABLE IF EXISTS book_issues CASCADE;
DROP TABLE IF EXISTS library_books CASCADE;
DROP TABLE IF EXISTS canteen_orders CASCADE;
DROP TABLE IF EXISTS canteen_menu CASCADE;
DROP TABLE IF EXISTS transport_routes CASCADE;
DROP TABLE IF EXISTS hostel_rooms CASCADE;
DROP TABLE IF EXISTS referral_centers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS cap_alerts CASCADE;
DROP TABLE IF EXISTS field_crowdsource_reports CASCADE;
DROP TABLE IF EXISTS road_segments CASCADE;
DROP TABLE IF EXISTS sensor_nodes CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;

-- ═══════════════════════════════════════════════════
-- STEP 2: CREATE TABLES
-- ═══════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE sensor_nodes (
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
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sensor_nodes_coords ON sensor_nodes (latitude, longitude);

CREATE TABLE road_segments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    section VARCHAR(100) NOT NULL,
    geometry TEXT NOT NULL,
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
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_road_segments_name ON road_segments (name);

CREATE TABLE field_crowdsource_reports (
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reports_verification ON field_crowdsource_reports (verified, created_at DESC);

CREATE TABLE cap_alerts (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(100) UNIQUE NOT NULL,
    sender VARCHAR(100) NOT NULL,
    sent TIMESTAMPTZ DEFAULT NOW(),
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
CREATE INDEX idx_alerts_sent ON cap_alerts (sent DESC);

CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_app_users_coords ON app_users (latitude, longitude);

-- ═══════════════════════════════════════════════════
-- STEP 3: FUNCTIONS (NO drift — only proximity + alerts)
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_nearby_users_for_alert(
    station_lat DOUBLE PRECISION,
    station_lon DOUBLE PRECISION,
    threshold_km DOUBLE PRECISION DEFAULT 15.0
)
RETURNS TABLE (
    user_id UUID, name VARCHAR, phone VARCHAR,
    latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name::VARCHAR, u.phone::VARCHAR, u.latitude, u.longitude,
        (2 * 6371.0 * ASIN(SQRT(
            POWER(SIN(radians(u.latitude - station_lat) / 2), 2) +
            COS(radians(station_lat)) * COS(radians(u.latitude)) *
            POWER(SIN(radians(u.longitude - station_lon) / 2), 2)
        ))) AS dist_km
    FROM app_users u
    WHERE (2 * 6371.0 * ASIN(SQRT(
            POWER(SIN(radians(u.latitude - station_lat) / 2), 2) +
            COS(radians(station_lat)) * COS(radians(u.latitude)) *
            POWER(SIN(radians(u.longitude - station_lon) / 2), 2)
        ))) <= threshold_km
    ORDER BY dist_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_active_alerts()
RETURNS SETOF cap_alerts AS $$
  SELECT * FROM cap_alerts WHERE status = 'Actual' ORDER BY sent DESC;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_nearby_users_for_alert(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_active_alerts() TO anon, authenticated;

-- ═══════════════════════════════════════════════════
-- STEP 4: ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════
ALTER TABLE sensor_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_crowdsource_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sensor_nodes" ON sensor_nodes FOR SELECT USING (true);
CREATE POLICY "Service write sensor_nodes" ON sensor_nodes FOR ALL USING (true);
CREATE POLICY "Public read road_segments" ON road_segments FOR SELECT USING (true);
CREATE POLICY "Service write road_segments" ON road_segments FOR ALL USING (true);
CREATE POLICY "Public read cap_alerts" ON cap_alerts FOR SELECT USING (true);
CREATE POLICY "Service write cap_alerts" ON cap_alerts FOR ALL USING (true);
CREATE POLICY "Public read reports" ON field_crowdsource_reports FOR SELECT USING (true);
CREATE POLICY "Public insert reports" ON field_crowdsource_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read users" ON app_users FOR SELECT USING (true);
CREATE POLICY "Public insert users" ON app_users FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════
-- STEP 5: REALTIME
-- ═══════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sensor_nodes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE cap_alerts;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE field_crowdsource_reports;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ═══════════════════════════════════════════════════
-- STEP 6: SEED 41 SENSORS — REALISTIC DISTRIBUTION
--   6 CRITICAL  |  8 HIGH  |  14 CAUTION  |  13 SAFE
-- ═══════════════════════════════════════════════════
INSERT INTO sensor_nodes (id, name, latitude, longitude, soil_moisture, rain_24h_obs, rain_48h_prior, rain_72h_prior, rain_7d_prior, api_7d, r24_seasonal_anom, api_seasonal_anom) VALUES

-- ── ASSAM (6) ──────────────────────────────────────
('SN-ASM-GUA-01','Guwahati Urban Hill Slopes (Kamrup Metro)',26.1445,91.7362,  22.5, 18.0, 12.0,  8.0,  45.0,  52.4,  -2.5,  -4.2),   -- SAFE
('SN-ASM-SIL-01','Silchar Hillocks (Cachar)',               24.8333,92.7789,  36.1, 42.0, 30.0, 18.0,  95.0, 108.4,  10.4,  15.6),   -- CAUTION
('SN-ASM-DH-01', 'Dima Hasao Rural Settlements',            25.1833,93.0167,  62.4,185.0,130.0, 90.0, 320.0, 350.5,  98.5, 142.4),   -- CRITICAL
('SN-ASM-HAF-01','Haflong Tribal Slopes',                    25.1667,93.0300,  40.5, 55.0, 42.0, 28.0, 140.0, 158.2,  18.2,  28.4),   -- CAUTION
('SN-ASM-KA-01', 'Karbi Anglong Remote Hamlets',            25.8489,93.4385,  28.2, 22.0, 18.0, 12.0,  62.0,  72.5,   1.2,   3.5),   -- SAFE
('SN-ASM-RRL-01','Lumding-Badarpur Hill Railway Cut',        25.0210,93.0230,  64.5,195.0,145.0,110.0, 380.0, 410.2, 112.5, 165.4),   -- CRITICAL

-- ── MEGHALAYA (5) ──────────────────────────────────
('SN-MEG-SHI-01','Shillong Municipal Cuts',                  25.5788,91.8831,  24.5, 15.0, 12.0,  8.0,  42.0,  48.4,  -4.4,  -8.6),   -- SAFE
('SN-MEG-TUR-01','Tura Town Slopes',                         25.5140,90.2200,  38.2, 48.0, 32.0, 22.0, 105.0, 118.2,   8.8,  16.4),   -- CAUTION
('SN-MEG-CHE-01','Cherrapunji Terraced Valleys',             25.2702,91.7323,  48.1, 92.0, 78.0, 60.0, 280.0, 312.4,  42.4,  80.2),   -- HIGH
('SN-MEG-MAW-01','Mawsynram Tribal Hamlets',                 25.3000,91.5833,  58.6,165.0,115.0, 90.0, 410.0, 452.8,  78.5, 130.6),   -- CRITICAL
('SN-MEG-EKH-01','East Khasi Hills Connectors',              25.4200,91.9000,  26.1, 20.0, 15.0, 10.0,  55.0,  62.5,   0.5,   2.8),   -- SAFE

-- ── SIKKIM (5) ─────────────────────────────────────
('SN-SKM-GAN-01','Gangtok Municipal Slopes',                 27.3314,88.6138,  50.4, 95.0, 72.0, 52.0, 220.0, 248.2,  38.5,  62.2),   -- HIGH
('SN-SKM-NAM-01','Namchi Urban Ridge',                       27.1667,88.3500,  38.2, 45.0, 35.0, 24.0, 110.0, 124.6,   8.4,  14.5),   -- CAUTION
('SN-SKM-MAN-01','Mangan Rural Farming Slopes',              27.5000,88.5167,  52.8,105.0, 82.0, 60.0, 240.0, 268.4,  48.6,  78.4),   -- HIGH
('SN-SKM-DZO-01','Dzongu Tribal Reserve',                    27.5300,88.4800,  51.2, 98.0, 78.0, 58.0, 230.0, 258.2,  44.5,  72.6),   -- HIGH
('SN-SKM-CHU-01','Chungthang Valley Slope',                  27.6042,88.6472,  66.5,210.0,175.0,140.0, 410.0, 448.5, 118.4, 172.5),   -- CRITICAL

-- ── NAGALAND (5) ───────────────────────────────────
('SN-NGL-KOH-01','Kohima Town Ridges',                       25.6751,94.1116,  46.2, 88.0, 65.0, 42.0, 180.0, 202.5,  32.4,  52.6),   -- HIGH
('SN-NGL-MOK-01','Mokokchung Urban Slopes',                  26.3263,94.5200,  38.5, 48.0, 35.0, 22.0, 110.0, 124.6,   8.5,  15.4),   -- CAUTION
('SN-NGL-PHE-01','Phek Hill Farming Villages',               25.6667,94.5000,  25.4, 18.0, 14.0, 10.0,  52.0,  58.5,  -1.1,   2.2),   -- SAFE
('SN-NGL-WOK-01','Wokha Terraced Hamlets',                   26.0833,94.2500,  40.6, 55.0, 40.0, 28.0, 132.0, 148.8,  14.4,  22.5),   -- CAUTION
('SN-NGL-KIP-01','Kiphire Remote Border Tracks',             25.9000,94.7833,  48.1, 85.0, 62.0, 44.0, 190.0, 218.4,  31.2,  48.5),   -- HIGH

-- ── MIZORAM (5) ────────────────────────────────────
('SN-MZR-AIZ-01','Aizawl Capital Ridge Slopes',              23.7307,92.7173,  47.4, 82.0, 60.0, 42.0, 185.0, 208.6,  28.8,  45.4),   -- HIGH
('SN-MZR-LUN-01','Lunglei Municipal Zone',                   22.8864,92.7483,  39.5, 52.0, 38.0, 25.0, 125.0, 142.4,  12.4,  20.5),   -- CAUTION
('SN-MZR-CHA-01','Champhai Agricultural Slopes',             23.4757,93.3277,  24.6, 15.0, 12.0,  8.0,  48.0,  55.5,  -2.5,  -4.2),   -- SAFE
('SN-MZR-SER-01','Serchhip Rural Clusters',                  23.3000,92.8333,  22.8, 12.0, 10.0,  6.0,  38.0,  42.4,  -5.2,  -8.2),   -- SAFE
('SN-MZR-LAW-01','Lawngtlai Hill Settlements',               22.5333,92.9000,  41.9, 62.0, 45.0, 30.0, 145.0, 165.6,  18.4,  28.5),   -- CAUTION

-- ── MANIPUR (5) ────────────────────────────────────
('SN-MNP-IMP-01','Imphal Valley Border Cuts',                24.8170,93.9368,  20.5, 12.0, 10.0,  6.0,  35.0,  40.2,  -4.5,  -8.2),   -- SAFE
('SN-MNP-UKH-01','Ukhrul Rural Hamlets',                     25.1167,94.4333,  49.4, 92.0, 70.0, 48.0, 210.0, 234.5,  35.4,  55.4),   -- HIGH
('SN-MNP-TAM-01','Tamenglong Tribal Slopes',                 24.9833,93.5000,  60.8,158.0,115.0, 85.0, 305.0, 342.4,  75.2, 114.6),   -- CRITICAL
('SN-MNP-SEN-01','Senapati Feeder Tracks',                   25.2667,94.0667,  37.6, 42.0, 32.0, 20.0,  98.0, 112.8,   6.4,  12.5),   -- CAUTION
('SN-MNP-CHU-01','Churachandpur Hill Clusters',              24.3333,93.6833,  39.5, 50.0, 38.0, 24.0, 118.0, 132.4,  10.4,  18.8),   -- CAUTION

-- ── ARUNACHAL PRADESH (6) ──────────────────────────
('SN-ARN-ITA-01','Itanagar Capital Slopes',                  27.0844,93.6053,  25.2, 20.0, 15.0, 10.0,  55.0,  64.2,   1.4,   3.5),   -- SAFE
('SN-ARN-PAS-01','Pasighat Hill Slopes',                     28.0667,95.3333,  37.5, 45.0, 35.0, 22.0, 108.0, 122.4,   8.6,  14.8),   -- CAUTION
('SN-ARN-TAW-01','Tawang Valley Settlements',                27.5849,91.8623,  59.4,145.0,110.0, 80.0, 290.0, 320.2,  72.4, 112.5),   -- CRITICAL
('SN-ARN-BOM-01','Bomdila Alpine Hamlets',                   27.2667,92.4000,  40.5, 55.0, 42.0, 28.0, 135.0, 152.4,  15.6,  25.8),   -- CAUTION
('SN-ARN-ZIR-01','Ziro Valley Farming Slopes',               27.5500,93.8333,  23.5, 14.0, 10.0,  6.0,  40.0,  46.5,  -3.5,  -6.2),   -- SAFE
('SN-ARN-ANJ-01','Anjaw Border Hamlets',                     28.0500,96.8500,  26.2, 22.0, 16.0, 10.0,  58.0,  65.2,   0.8,   2.8),   -- SAFE

-- ── TRIPURA (4) ────────────────────────────────────
('SN-TPR-AGA-01','Agartala Ridge Settlements',               23.8315,91.2868,  18.2,  8.0,  6.0,  4.0,  25.0,  28.4,  -8.5, -12.4),   -- SAFE
('SN-TPR-JAM-01','Jampui Hill Slopes',                       23.8500,92.2700,  38.8, 48.0, 35.0, 22.0, 112.0, 128.8,   9.2,  15.5),   -- CAUTION
('SN-TPR-DHA-01','Dharmanagar Settlement',                   24.3800,92.1800,  20.2, 10.0,  8.0,  5.0,  30.0,  34.2,  -6.5, -10.2),   -- SAFE
('SN-TPR-DHL-01','Dhalai District Slopes',                   23.8400,91.9800,  24.5, 16.0, 12.0,  8.0,  44.0,  50.2,  -2.2,  -3.8);   -- SAFE

-- ═══════════════════════════════════════════════════
-- STEP 7: SEED CAP ALERTS
-- ═══════════════════════════════════════════════════
INSERT INTO cap_alerts (identifier, sender, status, msg_type, scope, category, event, urgency, severity, certainty, headline, description, instruction, area_desc) VALUES
('CAP-NER-2026-001','NER-LDEWS-AI@mdoner.gov.in','Actual','Alert','Public','Met',
 'Landslide Warning','Immediate','Extreme','Observed',
 'EXTREME RISK: Sikkim North — Active slope mobilization at Chungthang corridor',
 'Inclinometer drift exceeding 0.08 deg/hr at North Sikkim. Piezometer 92 kPa. Rainfall 24h: 210mm. Risk Index: 9.2/10.',
 'IMMEDIATE: Suspend NH-10 traffic. Mobilize NDRF to Mangan junction. Evacuate settlements within 500m.',
 'North Sikkim — Mangan, Dzongu, Chungthang'),
('CAP-NER-2026-002','NER-LDEWS-AI@mdoner.gov.in','Actual','Alert','Public','Met',
 'Heavy Rainfall Advisory','Expected','Severe','Likely',
 'HIGH ALERT: Dima Hasao Railway Cut — 185mm rainfall, soil saturated at 62%',
 'Lumding-Badarpur railway corridor at critical failure threshold. API 7d: 410mm. Active mudslumps reported.',
 'Halt railway operations on Lumding-Badarpur section. Deploy clearing machinery at km 142.',
 'Assam — Dima Hasao, Lumding-Badarpur Railway'),
('CAP-NER-2026-003','NER-LDEWS-AI@mdoner.gov.in','Actual','Alert','Public','Met',
 'Rainfall Advisory','Expected','Moderate','Possible',
 'CAUTION: Meghalaya Cherrapunji Belt — 92mm observed, monitoring pore pressure',
 'Cherrapunji receiving sustained heavy rainfall. Soil VWC at 48%. Monitoring threshold approach.',
 'Advisory speed limits on NH-6. Pre-position equipment at Sohra junction.',
 'Meghalaya — Cherrapunji, Mawsynram Belt');

-- ═══════════════════════════════════════════════════
-- STEP 8: SEED CROWDSOURCE REPORTS
-- ═══════════════════════════════════════════════════
INSERT INTO field_crowdsource_reports (reporter_name, phone, latitude, longitude, description, category, crack_length, crack_depth, settlement_proximity, severity, verified) VALUES
('Ramesh Kumar','9876543210',25.6780,94.1150,
 'Large tension crack on NH-2 cut slope near Kohima bypass. Fresh scarp visible.',
 'Tension Crack',12.0,0.8,'<50m','HIGH',true),
('Priya Devi','8765432109',27.3400,88.6100,
 'Slope slump on Gangtok-Singtam approach road. Debris covering 30% of carriageway.',
 'Slope Slump',8.0,1.2,'50m-200m','CRITICAL',false),
('Field Officer T. Mizo','7654321098',23.7280,92.7190,
 'Small rockfall near Aizawl municipal boundary. Boulders on road verge. No casualties.',
 'Rockfall',0.0,0.0,'<50m','MODERATE',true);

-- ═══════════════════════════════════════════════════
-- VERIFY
-- ═══════════════════════════════════════════════════
SELECT 'sensor_nodes' AS tbl, COUNT(*) AS rows FROM sensor_nodes
UNION ALL SELECT 'cap_alerts', COUNT(*) FROM cap_alerts
UNION ALL SELECT 'field_crowdsource_reports', COUNT(*) FROM field_crowdsource_reports
UNION ALL SELECT 'road_segments', COUNT(*) FROM road_segments
UNION ALL SELECT 'app_users', COUNT(*) FROM app_users;
