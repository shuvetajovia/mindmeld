-- ============================================================
-- NER Landslide EWS — Seed Data
-- Paste this into Supabase SQL Editor and Run
-- ============================================================

-- ── 40 IoT Sensor Nodes (All 8 NER States) ────────────────

INSERT INTO sensor_nodes (id, name, latitude, longitude, soil_moisture, rain_24h_obs, rain_48h_prior, rain_72h_prior, rain_7d_prior, api_7d, r24_seasonal_anom, api_seasonal_anom)
VALUES
-- ASSAM (6 nodes)
('SN-ASM-GUA-01','Guwahati Urban Hill Slopes (Kamrup Metro)',26.1445,91.7362,38.5,45.2,62.1,88.4,210.5,145.2,12.4,28.6),
('SN-ASM-SIL-01','Silchar Hillocks (Cachar)',24.8333,92.7789,42.1,58.4,71.2,95.8,225.4,162.1,18.2,35.4),
('SN-ASM-DH-01','Dima Hasao Rural Settlements',25.1200,93.0200,55.8,92.5,118.4,145.2,352.8,248.6,42.5,85.2),
('SN-ASM-HAF-01','Haflong Tribal Slopes',25.1667,93.0167,48.2,72.8,98.4,128.5,310.2,218.4,28.6,62.4),
('SN-ASM-KA-01','Karbi Anglong Remote Hamlets',26.0000,93.5000,35.4,38.5,52.4,71.2,185.4,128.6,8.5,22.4),
('SN-ASM-RRL-01','Lumding-Badarpur Hill Railway Cut',25.2000,93.1500,62.4,105.8,135.2,168.4,412.5,295.8,52.4,105.6),
-- MEGHALAYA (4 nodes)
('SN-MEG-SHI-01','Shillong Urban Municipal Cuts (East Khasi)',25.5788,91.8933,44.5,65.2,88.4,115.2,285.4,198.6,22.5,48.2),
('SN-MEG-TUR-01','Tura Town Slopes (West Garo Hills)',25.5194,90.2131,38.8,48.5,65.2,88.4,218.5,152.4,14.5,32.8),
('SN-MEG-CHE-01','Cherrapunji Terraced Valleys (Sohra)',25.2700,91.7200,68.5,148.5,185.4,228.4,548.6,385.4,85.4,168.5),
('SN-MEG-MAW-01','Mawsynram Tribal Hamlets',25.2956,91.5823,65.2,138.4,172.5,218.6,525.8,368.4,78.4,155.2),
-- SIKKIM (5 nodes)
('SN-SKM-GAN-01','Gangtok City Slopes (East Sikkim)',27.3389,88.6065,52.4,85.4,112.8,145.2,352.8,248.4,42.5,88.2),
('SN-SKM-NAM-01','Namchi Urban Ridge (South Sikkim)',27.1658,88.3558,45.8,68.4,92.5,118.4,295.2,208.4,28.4,62.5),
('SN-SKM-MAN-01','Mangan Rural Farm Slopes (North Sikkim)',27.5088,88.5338,48.5,72.5,98.4,125.2,308.4,218.5,32.4,68.2),
('SN-SKM-DZO-01','Dzongu Tribal Reserve (North Sikkim)',27.6500,88.5500,55.4,92.5,118.4,148.5,368.4,258.4,45.2,92.5),
('SN-SKM-CHU-01','Chungthang Valley Cuttings (North)',27.6144,88.6403,58.8,98.4,125.2,158.5,392.5,278.4,48.5,98.4),
-- NAGALAND (5 nodes)
('SN-NGL-KOH-01','Kohima Municipal Ridges',25.6751,94.1116,58.2,95.4,122.5,155.2,382.8,268.4,48.5,98.2),
('SN-NGL-MOK-01','Mokokchung Urban Slopes',26.3294,94.5171,42.5,62.4,85.2,112.5,278.4,195.2,22.5,48.4),
('SN-NGL-PHE-01','Phek Farming Villages',25.6728,94.4658,32.4,35.4,48.5,65.2,162.5,114.2,8.2,18.5),
('SN-NGL-WOK-01','Wokha Terraced Hamlets',26.1021,94.2655,44.8,68.5,92.4,118.5,295.4,208.5,28.5,62.4),
('SN-NGL-KIP-01','Kiphire Border Tracks',25.8703,94.7956,48.2,72.5,98.4,125.8,312.5,218.4,32.5,68.5),
-- MIZORAM (5 nodes)
('SN-MZR-AIZ-01','Aizawl Municipal Slopes (Capital Ridge)',23.7271,92.7176,65.4,112.5,142.8,178.4,445.8,315.2,58.4,118.5),
('SN-MZR-LUN-01','Lunglei Town Zone',22.8867,92.7431,48.5,72.5,98.4,125.8,312.5,218.4,32.5,68.5),
('SN-MZR-CHA-01','Champhai Agricultural Slopes',23.4592,93.3282,38.5,48.5,65.2,85.4,215.5,152.4,14.5,32.8),
('SN-MZR-SER-01','Serchhip Rural Clusters',23.2973,92.9546,42.4,62.4,85.2,112.5,278.4,195.2,22.5,48.5),
('SN-MZR-LAW-01','Lawngtlai Hill Settlements',22.5253,92.8954,52.4,85.4,112.8,145.5,362.5,255.2,42.5,88.4),
-- MANIPUR (5 nodes)
('SN-MNP-IMP-01','Imphal Valley Border Cuts',24.8170,93.9368,35.4,42.5,58.4,78.4,198.5,138.4,12.5,28.4),
('SN-MNP-UKH-01','Ukhrul Rural Hamlets',25.1234,94.3612,55.4,92.5,118.4,148.5,368.5,258.5,45.2,92.5),
('SN-MNP-TAM-01','Tamenglong Tribal Slopes',24.9922,93.4925,58.8,98.4,125.8,158.5,392.8,278.5,48.5,98.5),
('SN-MNP-SEN-01','Senapati Feeder Tracks',25.2706,93.9706,44.5,65.2,88.4,115.5,288.4,202.5,24.5,52.4),
('SN-MNP-CHU-01','Churachandpur Hill Clusters',24.3328,93.6756,48.5,72.5,98.4,125.5,312.5,218.5,32.5,68.5),
-- ARUNACHAL PRADESH (6 nodes)
('SN-ARN-ITA-01','Itanagar Capital Slopes (Papum Pare)',27.0844,93.6053,44.5,65.2,88.4,115.2,285.4,200.2,22.5,48.5),
('SN-ARN-PAS-01','Pasighat Slopes (East Siang)',28.0667,95.3333,38.4,48.5,65.2,88.4,218.5,152.5,14.5,32.8),
('SN-ARN-TAW-01','Tawang Valley Settlements',27.5861,91.8594,62.4,108.5,138.4,172.5,428.5,302.5,55.4,112.5),
('SN-ARN-BOM-01','Bomdila Alpine Slopes (West Kameng)',27.2667,92.4000,58.8,98.4,125.8,158.5,392.8,278.5,48.5,98.5),
('SN-ARN-ZIR-01','Ziro Valley (Lower Subansiri)',27.5453,93.8202,42.5,62.4,85.2,112.5,278.5,195.4,22.5,48.5),
('SN-ARN-ANJ-01','Anjaw Border Hamlets',28.0500,97.2000,48.5,72.5,98.4,125.5,312.5,218.5,32.5,68.5),
-- TRIPURA (4 nodes)
('SN-TPR-AGA-01','Agartala Border Ridges (West Tripura)',23.8315,91.2868,28.5,32.4,45.2,62.5,158.4,112.5,8.2,18.4),
('SN-TPR-JAM-01','Jampui Hills Tribal Slopes (North Tripura)',24.2000,92.1000,48.5,72.5,98.4,125.5,312.5,218.5,32.5,68.5),
('SN-TPR-DHA-01','Dharmanagar Rural Slopes (Unakoti)',24.3700,92.0300,38.5,48.5,65.2,88.4,218.5,152.5,14.5,32.8),
('SN-TPR-DHL-01','Dhalai District Clusters',24.0000,91.8500,42.5,62.4,85.2,112.5,278.5,195.4,22.5,48.5)
ON CONFLICT (id) DO UPDATE SET
    soil_moisture     = EXCLUDED.soil_moisture,
    rain_24h_obs      = EXCLUDED.rain_24h_obs,
    rain_48h_prior    = EXCLUDED.rain_48h_prior,
    rain_72h_prior    = EXCLUDED.rain_72h_prior,
    rain_7d_prior     = EXCLUDED.rain_7d_prior,
    api_7d            = EXCLUDED.api_7d,
    r24_seasonal_anom = EXCLUDED.r24_seasonal_anom,
    api_seasonal_anom = EXCLUDED.api_seasonal_anom,
    last_updated      = NOW();

-- ── CAP Alerts ────────────────────────────────────────────

INSERT INTO cap_alerts (identifier, sender, status, msg_type, scope, category, event, urgency, severity, certainty, headline, description, instruction, area_desc)
VALUES
('CAP-NER-2026-001','NER-LDEWS-AI@mdoner.gov.in','Actual','Alert','Public','Met',
 'Landslide Warning','Immediate','Extreme','Observed',
 'EXTREME RISK: Sikkim Central Zone — Active slope mobilization at Mangan-Dzongu-Chungthang corridors',
 'Inclinometer surface drift exceeding 0.08 deg/hr at North Sikkim. Piezometer 92 kPa. Rainfall 24h: 98mm. AI Risk Index: 9.2/10.',
 'IMMEDIATE: Suspend NH-10 traffic. Mobilize NDRF to Mangan junction. Evacuate settlements within 500m.',
 'North Sikkim — Mangan, Dzongu, Chungthang Sectors'),
('CAP-NER-2026-002','NER-LDEWS-AI@mdoner.gov.in','Actual','Alert','Public','Met',
 'Heavy Rainfall Advisory','Expected','Severe','Likely',
 'HEAVY RAIN ADVISORY: Meghalaya Cherrapunji-Mawsynram Belt — 148mm observed in 24 hours',
 'GSMap confirms extreme precipitation over Meghalaya escarpment. Soil VWC 68.5%. API 7d: 385mm.',
 'Caution on NH-6 and NH-44. Pre-position equipment at Nongstoin and Jowai junctions.',
 'Meghalaya — East Khasi Hills, Cherrapunji (Sohra), Mawsynram')
ON CONFLICT (identifier) DO NOTHING;

-- ── Add missing columns from schema.sql (not in v1.sql) ──
ALTER TABLE field_crowdsource_reports
  ADD COLUMN IF NOT EXISTS severity VARCHAR(30) DEFAULT 'MODERATE';

-- ── Sample Crowdsource Reports ────────────────────────────

INSERT INTO field_crowdsource_reports (reporter_name, phone, latitude, longitude, description, category, crack_length, crack_depth, settlement_proximity, severity, verified)
VALUES
('Ramesh Kumar','9876543210',25.6780,94.1150,
 'Large tension crack on NH-2 cut slope near Kohima bypass. Fresh scarp visible. Crack length approx 12m.',
 'Tension Crack',12.0,0.8,'<50m','HIGH',true),
('Priya Devi','8765432109',27.3400,88.6100,
 'Slope slump on Gangtok-Singtam approach road. Debris covering 30% of carriageway. Fresh seepage.',
 'Slope Slump',8.0,1.2,'50m-200m','CRITICAL',false),
('Field Officer T. Mizo','7654321098',23.7280,92.7190,
 'Small rockfall near Aizawl municipal boundary. Boulders on road verge. No casualties.',
 'Rockfall',0.0,0.0,'<50m','MODERATE',true)
ON CONFLICT DO NOTHING;

-- ── RLS Policies ──────────────────────────────────────────

ALTER TABLE sensor_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_crowdsource_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read sensor_nodes" ON sensor_nodes;
CREATE POLICY "Public read sensor_nodes" ON sensor_nodes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service write sensor_nodes" ON sensor_nodes;
CREATE POLICY "Service write sensor_nodes" ON sensor_nodes FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read road_segments" ON road_segments;
CREATE POLICY "Public read road_segments" ON road_segments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read cap_alerts" ON cap_alerts;
CREATE POLICY "Public read cap_alerts" ON cap_alerts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read reports" ON field_crowdsource_reports;
CREATE POLICY "Public read reports" ON field_crowdsource_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert reports" ON field_crowdsource_reports;
CREATE POLICY "Public insert reports" ON field_crowdsource_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert users" ON app_users;
CREATE POLICY "Public insert users" ON app_users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read users" ON app_users;
CREATE POLICY "Public read users" ON app_users FOR SELECT USING (true);

-- ── Verify ────────────────────────────────────────────────
SELECT 'sensor_nodes' AS tbl, COUNT(*) FROM sensor_nodes
UNION ALL
SELECT 'cap_alerts', COUNT(*) FROM cap_alerts
UNION ALL
SELECT 'field_crowdsource_reports', COUNT(*) FROM field_crowdsource_reports;
