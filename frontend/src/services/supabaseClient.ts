import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Detect whether Supabase is configured (both vars must be real values)
export const isSupabaseConfigured =
  !!SUPABASE_URL &&
  !!SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.length > 20;

// Singleton client — reused across the whole app
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 2 } },
    })
  : null;

export type SupabaseSensorRow = {
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
};

export type SupabaseAlertRow = {
  id: number;
  identifier: string;
  sender: string;
  sent: string;
  status: string;
  msg_type: string;
  scope: string;
  category: string;
  event: string;
  urgency: string;
  severity: string;
  certainty: string;
  headline: string;
  description: string | null;
  instruction: string | null;
  area_desc: string;
};
