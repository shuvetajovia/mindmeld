-- Supabase Migration v3.sql
-- Live IoT Sensor Drift Simulation via Postgres RPC
-- Called by the frontend on each polling cycle to simulate real sensor pushes

-- ============================================================
-- simulate_sensor_drift()
-- Updates all 40 sensor nodes with realistic monsoon-aware drift
-- Mimics actual IoT telemetry variance (AWS rain gauges, VWC probes, etc.)
-- ============================================================
CREATE OR REPLACE FUNCTION simulate_sensor_drift()
RETURNS json AS $$
DECLARE
  updated_count INTEGER;
  r RECORD;
BEGIN
  -- Apply per-node drift with realistic physical constraints
  FOR r IN SELECT id, soil_moisture, rain_24h_obs, api_7d FROM sensor_nodes LOOP
    
    -- Rain events: 25% chance of rain increment (0-5mm), otherwise slow drain
    DECLARE
      rain_delta DOUBLE PRECISION;
      sm_delta   DOUBLE PRECISION;
      api_delta  DOUBLE PRECISION;
    BEGIN
      rain_delta := CASE
        WHEN random() > 0.75 THEN random() * 5.0          -- Rain spike
        WHEN random() > 0.50 THEN -random() * 1.0         -- Slow drain
        ELSE 0.0
      END;

      -- Soil moisture lags rain by ~3h, also affected by sun exposure
      sm_delta := (rain_delta * 0.35) + ((random() - 0.52) * 0.8);

      -- API 7d accumulates slowly, decays with k=0.84
      api_delta := (rain_delta * 0.15) - (r.api_7d * 0.002);

      UPDATE sensor_nodes SET
        rain_24h_obs      = GREATEST(0.0, LEAST(350.0, rain_24h_obs + rain_delta)),
        rain_48h_prior    = GREATEST(0.0, LEAST(500.0, rain_48h_prior + rain_delta * 0.6 + (random()-0.5)*0.5)),
        rain_72h_prior    = GREATEST(0.0, LEAST(600.0, rain_72h_prior + rain_delta * 0.4 + (random()-0.5)*0.3)),
        rain_7d_prior     = GREATEST(0.0, LEAST(900.0, rain_7d_prior  + rain_delta * 0.2 + (random()-0.5)*0.2)),
        api_7d            = GREATEST(0.0, LEAST(350.0, api_7d + api_delta)),
        soil_moisture     = GREATEST(5.0,  LEAST(95.0, soil_moisture + sm_delta)),
        r24_seasonal_anom = (rain_24h_obs + rain_delta) - (60.0 + random() * 20.0),  -- vs 30yr mean
        api_seasonal_anom = (api_7d + api_delta) - (180.0 + random() * 40.0),
        last_updated      = NOW()
      WHERE id = r.id;
    END;

  END LOOP;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Return summary
  RETURN json_build_object(
    'updated', updated_count,
    'timestamp', NOW(),
    'status', 'drift_applied'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anonymous callers to invoke the drift function (frontend polling)
GRANT EXECUTE ON FUNCTION simulate_sensor_drift() TO anon;
GRANT EXECUTE ON FUNCTION simulate_sensor_drift() TO authenticated;

-- ============================================================
-- get_active_alerts()
-- Returns all active CAP alerts ordered by severity
-- ============================================================
CREATE OR REPLACE FUNCTION get_active_alerts()
RETURNS SETOF cap_alerts AS $$
  SELECT * FROM cap_alerts
  WHERE status = 'Actual'
  ORDER BY sent DESC;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_alerts() TO anon;
GRANT EXECUTE ON FUNCTION get_active_alerts() TO authenticated;

-- ============================================================
-- Allow realtime on sensor_nodes table
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE cap_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE field_crowdsource_reports;
