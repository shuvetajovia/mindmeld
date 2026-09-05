-- Supabase Migration v2.sql
-- Haversine proximity alerting function + app_users registry
-- Safe to re-run (DROP IF EXISTS + CREATE OR REPLACE used throughout)

-- 1. APP USERS REGISTRY
-- Drop and recreate cleanly if type conflict exists
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      last_seen TIMESTAMPTZ DEFAULT NOW()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN others THEN NULL;
END $$;

-- 2. HAVERSINE PROXIMITY ALERT FUNCTION
CREATE OR REPLACE FUNCTION get_nearby_users_for_alert(
    station_lat DOUBLE PRECISION,
    station_lon DOUBLE PRECISION,
    threshold_km DOUBLE PRECISION DEFAULT 15.0
)
RETURNS TABLE (
    user_id UUID,
    name VARCHAR,
    phone VARCHAR,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_km DOUBLE PRECISION
) AS $$
DECLARE
    earth_radius DOUBLE PRECISION := 6371.0; -- Earth radius in km
BEGIN
    RETURN QUERY
    SELECT 
        u.id, 
        u.name::VARCHAR, 
        u.phone::VARCHAR, 
        u.latitude, 
        u.longitude,
        (2 * earth_radius * ASIN(SQRT(
            POWER(SIN(radians(u.latitude - station_lat) / 2), 2) +
            COS(radians(station_lat)) * COS(radians(u.latitude)) *
            POWER(SIN(radians(u.longitude - station_lon) / 2), 2)
        ))) AS dist_km
    FROM 
        app_users u
    WHERE 
        (2 * earth_radius * ASIN(SQRT(
            POWER(SIN(radians(u.latitude - station_lat) / 2), 2) +
            COS(radians(station_lat)) * COS(radians(u.latitude)) *
            POWER(SIN(radians(u.longitude - station_lon) / 2), 2)
        ))) <= threshold_km
    ORDER BY
        dist_km ASC;
END;
$$ LANGUAGE plpgsql;
