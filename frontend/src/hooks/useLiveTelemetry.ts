import { useState, useEffect, useCallback, useRef } from "react";
import { mockApi } from "../services/mockApi";
import { supabase, isSupabaseConfigured, SupabaseSensorRow, SupabaseAlertRow } from "../services/supabaseClient";

export interface SensorNodeData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  soil_moisture: number;
  rain_24h_obs: number;
  rain_48h_prior: number;
  rain_72h_prior: number;
  rain_7d_prior: number;
  api_7d: number;
  r24_seasonal_anom: number;
  api_seasonal_anom: number;
  last_updated: string;
}

export interface CorridorSection {
  id: number;
  section: string;
  length_km: number;
  risk_score: number;
  risk_probability: number;
  status: string;
  coordinates: [number, number][];
  slope_angle: number;
  elevation: number;
  distance_to_infrastructure: number;
  primary_shap_trigger: string;
  sensor_node_id: string;
}

export interface CorridorData {
  name: string;
  status: string;
  max_risk: number;
  average_risk: number;
  length_km: number;
  sections: CorridorSection[];
}

export interface CAPAlertData {
  identifier: string;
  sender: string;
  sent: string;
  status: string;
  msgType: string;
  scope: string;
  info: {
    category: string;
    event: string;
    urgency: string;
    severity: string;
    certainty: string;
    headline: string;
    description: string;
    instruction?: string;
    senderName: string;
    area: { areaDesc: string; polygon?: string }[];
  }[];
}

// Map Supabase sensor row → SensorNodeData
function mapSensorRow(row: SupabaseSensorRow): SensorNodeData {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    soil_moisture: Number(row.soil_moisture),
    rain_24h_obs: Number(row.rain_24h_obs),
    rain_48h_prior: Number(row.rain_48h_prior),
    rain_72h_prior: Number(row.rain_72h_prior),
    rain_7d_prior: Number(row.rain_7d_prior),
    api_7d: Number(row.api_7d),
    r24_seasonal_anom: Number(row.r24_seasonal_anom),
    api_seasonal_anom: Number(row.api_seasonal_anom),
    last_updated: row.last_updated,
  };
}

// Map Supabase alert row → CAPAlertData
function mapAlertRow(row: SupabaseAlertRow): CAPAlertData {
  return {
    identifier: row.identifier,
    sender: row.sender,
    sent: row.sent,
    status: row.status,
    msgType: row.msg_type,
    scope: row.scope,
    info: [{
      category: row.category,
      event: row.event,
      urgency: row.urgency,
      severity: row.severity,
      certainty: row.certainty,
      headline: row.headline,
      description: row.description ?? "",
      instruction: row.instruction ?? undefined,
      senderName: row.sender,
      area: [{ areaDesc: row.area_desc }],
    }],
  };
}

export function useLiveTelemetry(
  apiBaseUrl: string,
  refreshIntervalMs: number = 10000
) {
  const [sensors, setSensors] = useState<SensorNodeData[]>([]);
  const [corridors, setCorridors] = useState<CorridorData[]>([]);
  const [alerts, setAlerts] = useState<CAPAlertData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);
  const realtimeChannelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  // ── Supabase fetch ───────────────────────────────────────
  const fetchFromSupabase = useCallback(async (): Promise<boolean> => {
    if (!supabase || !isSupabaseConfigured) return false;

    try {
      // 1. Trigger server-side sensor drift via RPC (simulates IoT push)
      await supabase.rpc("simulate_sensor_drift").throwOnError();

      // 2. Fetch fresh sensor data after drift
      const { data: sensorRows, error: sErr } = await supabase
        .from("sensor_nodes")
        .select("*")
        .order("id");
      if (sErr) throw sErr;

      // 3. Fetch active CAP alerts
      const { data: alertRows, error: aErr } = await supabase
        .from("cap_alerts")
        .select("*")
        .eq("status", "Actual")
        .order("sent", { ascending: false });
      if (aErr) throw aErr;

      setSensors((sensorRows as SupabaseSensorRow[]).map(mapSensorRow));
      setAlerts((alertRows as SupabaseAlertRow[]).map(mapAlertRow));
      setCorridors(mockApi.getCorridors()); // corridors remain mock-computed from sensor data
      setIsOfflineFallback(false);
      setError(null);
      return true;
    } catch (err: any) {
      console.warn("[useLiveTelemetry] Supabase fetch failed:", err?.message);
      return false;
    }
  }, []);

  // ── Mock fallback with drift ─────────────────────────────
  const fetchFromMock = useCallback(() => {
    const currentSensors = mockApi.getSensors();
    const drifted = currentSensors.map(s => {
      const driftSM   = (Math.random() - 0.5) * 0.8;
      const driftRain = Math.random() > 0.75 ? Math.random() * 2.0 : 0.0;
      return {
        ...s,
        soil_moisture: Math.max(10.0, Math.min(95.0, s.soil_moisture + driftSM)),
        rain_24h_obs:  Math.max(0.0,  s.rain_24h_obs + driftRain),
        api_7d:        Math.max(0.0,  s.api_7d + driftRain),
        last_updated:  new Date().toISOString(),
      };
    });
    mockApi.saveSensors(drifted);
    setSensors(drifted);
    setCorridors(mockApi.getCorridors());
    setAlerts(mockApi.getActiveAlerts());
    setIsOfflineFallback(true);
    setError(null);
  }, []);

  // ── Unified fetch ────────────────────────────────────────
  const fetchTelemetry = useCallback(async () => {
    // Try REST API backend first
    try {
      const [sensorsRes, corridorsRes, alertsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/telemetry/nodes`),
        fetch(`${apiBaseUrl}/api/v1/corridors/status`),
        fetch(`${apiBaseUrl}/api/v1/alerts/active`),
      ]);
      if (!sensorsRes.ok || !corridorsRes.ok || !alertsRes.ok) throw new Error("API unavailable");
      setSensors(await sensorsRes.json());
      setCorridors(await corridorsRes.json());
      setAlerts((await alertsRes.json()).alerts || []);
      setIsOfflineFallback(false);
      setError(null);
      setLoading(false);
      return;
    } catch (_) { /* fall through */ }

    // Try Supabase live DB
    const supabaseOk = await fetchFromSupabase();
    if (!supabaseOk) {
      // Final fallback: client-side mock with drift
      fetchFromMock();
    }
    setLoading(false);
  }, [apiBaseUrl, fetchFromSupabase, fetchFromMock]);

  // ── Supabase Realtime subscription ──────────────────────
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    // Subscribe to sensor_nodes INSERT/UPDATE events with unique channel id for React Strict Mode
    const channelId = `sensor-live-feed-${Math.random().toString(36).substring(7)}`;
    const channel = supabase!
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sensor_nodes" },
        (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const updated = mapSensorRow(payload.new as SupabaseSensorRow);
            setSensors(prev =>
              prev.map(s => s.id === updated.id ? updated : s)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cap_alerts" },
        () => {
          // Refetch alerts on any change
          supabase!
            .from("cap_alerts")
            .select("*")
            .eq("status", "Actual")
            .order("sent", { ascending: false })
            .then(({ data }) => {
              if (data) setAlerts((data as SupabaseAlertRow[]).map(mapAlertRow));
            });
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  // ── Initial fetch + polling interval ────────────────────
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchTelemetry, refreshIntervalMs]);

  return {
    sensors,
    corridors,
    alerts,
    loading,
    error,
    isOfflineFallback,
    isSupabaseLive: isSupabaseConfigured && !isOfflineFallback,
    refresh: fetchTelemetry,
  };
}
