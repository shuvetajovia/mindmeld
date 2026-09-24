-- =========================================================================
-- NER Landslide Early Warning System (EWS) - SQL1 Update Migration
-- File: supabase/sql1.sql
-- Purpose:
-- 1. Updates & resets all 40 IoT Sensor Nodes to realistic calibrated values.
-- 2. Updates simulate_sensor_drift() with physical bounds (calm zones: 15-65mm, extreme: 90-180mm).
-- 3. Harmonizes corridor node risks so safe highway areas never show false critical alarms.
-- =========================================================================

-- 1. UPDATE AND REPLACE simulate_sensor_drift() WITH PHYSICAL BOUNDS
CREATE OR REPLACE FUNCTION simulate_sensor_drift()
RETURNS json AS $$
DECLARE
  updated_count INTEGER;
  r RECORD;
BEGIN
  FOR r IN SELECT id, soil_moisture, rain_24h_obs, api_7d FROM sensor_nodes LOOP
    DECLARE
      rain_delta DOUBLE PRECISION;
      sm_delta   DOUBLE PRECISION;
      is_extreme_zone BOOLEAN;
    BEGIN
      -- Active extreme monsoon hotspots (Cherrapunji, Chungthang, Dzongu, Mangan, Mawsynram, Dima Hasao, Lumding, Kohima, Aizawl, Tawang, Tamenglong)
      is_extreme_zone := r.id IN (
        'SN-MEG-CHE-01', 'SN-MEG-MAW-01', 'SN-SKM-CHU-01', 'SN-SKM-MAN-01', 'SN-SKM-DZO-01',
        'SN-ASM-DH-01', 'SN-ASM-RRL-01', 'SN-NGL-KOH-01', 'SN-MZR-AIZ-01', 'SN-ARN-TAW-01',
        'SN-MNP-TAM-01'
      );

      IF is_extreme_zone THEN
        -- High monsoon drift (oscillates around 100-180mm rain, 55-80% SM)
        rain_delta := (random() - 0.48) * 1.5;
        sm_delta   := (random() - 0.48) * 0.5;
        
        UPDATE sensor_nodes SET
          rain_24h_obs      = GREATEST(90.0, LEAST(185.0, rain_24h_obs + rain_delta)),
          rain_48h_prior    = GREATEST(120.0, LEAST(240.0, rain_48h_prior + rain_delta * 0.8)),
          rain_72h_prior    = GREATEST(150.0, LEAST(280.0, rain_72h_prior + rain_delta * 0.6)),
          rain_7d_prior     = GREATEST(320.0, LEAST(580.0, rain_7d_prior  + rain_delta * 0.4)),
          api_7d            = GREATEST(220.0, LEAST(420.0, api_7d + rain_delta * 0.5)),
          soil_moisture     = GREATEST(55.0,  LEAST(80.0, soil_moisture + sm_delta)),
          r24_seasonal_anom = GREATEST(30.0, LEAST(85.0, (rain_24h_obs + rain_delta) - 65.0)),
          api_seasonal_anom = GREATEST(60.0, LEAST(175.0, (api_7d + rain_delta * 0.5) - 180.0)),
          last_updated      = NOW()
        WHERE id = r.id;
      ELSE
        -- Nominal safe stations (oscillates gently around realistic calm/safe values: 18-58mm rain, 28-44% SM)
        rain_delta := (random() - 0.50) * 0.5;
        sm_delta   := (random() - 0.50) * 0.25;

        UPDATE sensor_nodes SET
          rain_24h_obs      = GREATEST(15.0, LEAST(58.0, rain_24h_obs + rain_delta)),
          rain_48h_prior    = GREATEST(20.0, LEAST(75.0, rain_48h_prior + rain_delta * 0.8)),
          rain_72h_prior    = GREATEST(25.0, LEAST(95.0, rain_72h_prior + rain_delta * 0.6)),
          rain_7d_prior     = GREATEST(60.0, LEAST(190.0, rain_7d_prior  + rain_delta * 0.4)),
          api_7d            = GREATEST(50.0, LEAST(140.0, api_7d + rain_delta * 0.5)),
          soil_moisture     = GREATEST(24.0, LEAST(44.0, soil_moisture + sm_delta)),
          r24_seasonal_anom = GREATEST(-20.0, LEAST(15.0, (rain_24h_obs + rain_delta) - 40.0)),
          api_seasonal_anom = GREATEST(-35.0, LEAST(30.0, (api_7d + rain_delta * 0.5) - 95.0)),
          last_updated      = NOW()
        WHERE id = r.id;
      END IF;
    END;
  END LOOP;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN json_build_object(
    'updated', updated_count,
    'timestamp', NOW(),
    'status', 'bounded_drift_applied'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION simulate_sensor_drift() TO anon, authenticated;

-- 2. RESET ALL 40 IOT SENSOR NODES TO CALIBRATED METRICS
INSERT INTO sensor_nodes (id, name, latitude, longitude, soil_moisture, rain_24h_obs, rain_48h_prior, rain_72h_prior, rain_7d_prior, api_7d, r24_seasonal_anom, api_seasonal_anom)
VALUES
-- ASSAM (6 nodes)
('SN-ASM-GUA-01','Guwahati Urban Hill Slopes (Kamrup Metro)',26.1445,91.7362,32.5,28.2,38.1,52.4,120.5,85.2,4.4,12.6),
('SN-ASM-SIL-01','Silchar Hillocks (Cachar)',24.8333,92.7789,35.1,38.4,48.2,65.8,145.4,102.1,8.2,18.4),
('SN-ASM-DH-01','Dima Hasao Rural Settlements',25.1200,93.0200,58.8,112.5,138.4,165.2,382.8,268.6,48.5,95.2),
('SN-ASM-HAF-01','Haflong Tribal Slopes',25.1667,93.0167,44.2,48.8,68.4,92.5,210.2,148.4,14.6,32.4),
('SN-ASM-KA-01','Karbi Anglong Remote Hamlets',26.0000,93.5000,31.4,28.5,38.4,51.2,115.4,88.6,3.5,12.4),
('SN-ASM-RRL-01','Lumding-Badarpur Hill Railway Cut',25.2000,93.1500,62.4,125.8,145.2,178.4,422.5,305.8,58.4,115.6),

-- MEGHALAYA (4 nodes)
('SN-MEG-SHI-01','Shillong Urban Municipal Cuts (East Khasi)',25.5788,91.8933,36.5,35.2,48.4,68.2,145.4,108.6,8.5,22.2),
('SN-MEG-TUR-01','Tura Town Slopes (West Garo Hills)',25.5194,90.2131,34.8,32.5,45.2,62.4,138.5,98.4,6.5,18.8),
('SN-MEG-CHE-01','Cherrapunji Terraced Valleys (Sohra)',25.2700,91.7200,68.5,148.5,185.4,228.4,548.6,385.4,85.4,168.5),
('SN-MEG-MAW-01','Mawsynram Tribal Hamlets',25.2956,91.5823,65.2,138.4,172.5,218.6,525.8,368.4,78.4,155.2),

-- SIKKIM (5 nodes)
('SN-SKM-GAN-01','Gangtok City Slopes (East Sikkim)',27.3389,88.6065,52.4,85.4,112.8,145.2,352.8,248.4,42.5,88.2),
('SN-SKM-NAM-01','Namchi Urban Ridge (South Sikkim)',27.1658,88.3558,38.8,42.4,58.5,78.4,165.2,118.4,10.4,24.5),
('SN-SKM-MAN-01','Mangan Rural Farm Slopes (North Sikkim)',27.5088,88.5338,62.5,128.5,158.4,195.2,428.4,318.5,58.4,118.2),
('SN-SKM-DZO-01','Dzongu Tribal Reserve (North Sikkim)',27.6500,88.5500,64.4,135.5,168.4,208.5,448.4,338.4,62.2,125.5),
('SN-SKM-CHU-01','Chungthang Valley Cuttings (North)',27.6144,88.6403,66.8,142.4,175.2,218.5,462.5,348.4,68.5,138.4),

-- NAGALAND (5 nodes)
('SN-NGL-KOH-01','Kohima Municipal Ridges',25.6751,94.1116,58.2,95.4,122.5,155.2,382.8,268.4,48.5,98.2),
('SN-NGL-MOK-01','Mokokchung Urban Slopes',26.3294,94.5171,36.5,38.4,52.2,72.5,148.4,105.2,8.5,22.4),
('SN-NGL-PHE-01','Phek Farming Villages',25.6728,94.4658,30.4,25.4,35.5,48.2,112.5,78.2,3.2,10.5),
('SN-NGL-WOK-01','Wokha Terraced Hamlets',26.1021,94.2655,38.8,42.5,58.4,78.5,165.4,118.5,12.5,26.4),
('SN-NGL-KIP-01','Kiphire Border Tracks',25.8703,94.7956,42.2,48.5,65.4,88.8,182.5,128.4,15.5,32.5),

-- MIZORAM (5 nodes)
('SN-MZR-AIZ-01','Aizawl Municipal Slopes (Capital Ridge)',23.7271,92.7176,65.4,112.5,142.8,178.4,445.8,315.2,58.4,118.5),
('SN-MZR-LUN-01','Lunglei Town Zone',22.8867,92.7431,42.5,48.5,65.4,88.8,182.5,128.4,14.5,32.5),
('SN-MZR-CHA-01','Champhai Agricultural Slopes',23.4592,93.3282,32.5,32.5,45.2,62.4,135.5,95.4,5.5,14.8),
('SN-MZR-SER-01','Serchhip Rural Clusters',23.2973,92.9546,35.4,36.4,48.2,68.5,148.4,105.2,7.5,18.5),
('SN-MZR-LAW-01','Lawngtlai Hill Settlements',22.5253,92.8954,46.4,55.4,78.8,102.5,212.5,148.2,18.5,38.4),

-- MANIPUR (5 nodes)
('SN-MNP-IMP-01','Imphal Valley Border Cuts',24.8170,93.9368,30.4,28.5,38.4,52.4,118.5,82.4,4.5,12.4),
('SN-MNP-UKH-01','Ukhrul Rural Hamlets',25.1234,94.3612,48.4,62.5,85.4,112.5,248.5,178.5,22.2,48.5),
('SN-MNP-TAM-01','Tamenglong Tribal Slopes',24.9922,93.4925,58.8,98.4,125.8,158.5,392.8,278.5,48.5,98.5),
('SN-MNP-SEN-01','Senapati Feeder Tracks',25.2706,93.9706,36.5,38.2,52.4,72.5,158.4,112.5,8.5,20.4),
('SN-MNP-CHU-01','Churachandpur Hill Clusters',24.3328,93.6756,40.5,45.5,62.4,85.5,178.5,124.5,12.5,28.5),

-- ARUNACHAL PRADESH (6 nodes)
('SN-ARN-ITA-01','Itanagar Capital Slopes (Papum Pare)',27.0844,93.6053,38.2,35.2,48.4,65.2,145.4,102.2,8.5,18.5),
('SN-ARN-PAS-01','Pasighat Slopes (East Siang)',28.0667,95.3333,34.4,32.5,45.2,62.4,138.5,95.5,6.5,16.8),
('SN-ARN-TAW-01','Tawang Valley Settlements',27.5861,91.8594,62.4,108.5,138.4,172.5,428.5,302.5,55.4,112.5),
('SN-ARN-BOM-01','Bomdila Alpine Slopes (West Kameng)',27.2667,92.4000,45.8,52.4,72.8,98.5,212.8,148.5,16.5,35.5),
('SN-ARN-ZIR-01','Ziro Valley (Lower Subansiri)',27.5453,93.8202,36.5,34.4,48.2,65.5,142.5,98.4,7.5,18.5),
('SN-ARN-ANJ-01','Anjaw Border Hamlets',28.0500,97.2000,42.5,45.5,62.4,85.5,182.5,125.5,12.5,26.5),

-- TRIPURA (4 nodes)
('SN-TPR-AGA-01','Agartala Border Ridges (West Tripura)',23.8315,91.2868,28.5,22.4,32.2,45.5,108.4,72.5,2.2,8.4),
('SN-TPR-JAM-01','Jampui Hills Tribal Slopes (North Tripura)',24.2000,92.1000,42.5,46.5,62.4,82.5,178.5,122.5,11.5,24.5),
('SN-TPR-DHA-01','Dharmanagar Rural Slopes (Unakoti)',24.3700,92.0300,32.5,28.5,38.2,52.4,118.5,82.5,4.5,12.8),
('SN-TPR-DHL-01','Dhalai District Clusters',24.0000,91.8500,35.5,32.4,45.2,62.5,138.5,95.4,6.5,15.5)
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

-- 3. VERIFICATION REPORT
SELECT id, name, soil_moisture, rain_24h_obs, api_7d, last_updated 
FROM sensor_nodes 
ORDER BY id ASC;
