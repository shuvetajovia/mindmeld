/**
 * liveWeatherService.ts — Real-time live meteorological telemetry ingestion.
 * Fetches satellite & ground telemetry (precipitation, 24h rainfall, soil moisture VWC)
 * from Open-Meteo for all 41 Northeast India stations.
 */

import { SensorNodeData } from "../hooks/useLiveTelemetry";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export interface StationCoordinate {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const NER_STATIONS: StationCoordinate[] = [
  // 1. ASSAM
  { id: "SN-ASM-GUA-01", name: "Guwahati Urban Hill Slopes (Kamrup Metro)", latitude: 26.1445, longitude: 91.7362 },
  { id: "SN-ASM-SIL-01", name: "Silchar Hillocks (Cachar)", latitude: 24.8333, longitude: 92.7789 },
  { id: "SN-ASM-DH-01", name: "Dima Hasao Rural Settlements", latitude: 25.1833, longitude: 93.0167 },
  { id: "SN-ASM-HAF-01", name: "Haflong Tribal Slopes", latitude: 25.1667, longitude: 93.0300 },
  { id: "SN-ASM-KA-01", name: "Karbi Anglong Remote Hamlets", latitude: 25.8489, longitude: 93.4385 },
  { id: "SN-ASM-RRL-01", name: "Lumding-Badarpur Hill Railway Cut", latitude: 25.0210, longitude: 93.0230 },

  // 2. MEGHALAYA
  { id: "SN-MEG-SHI-01", name: "Shillong Municipal Cuts", latitude: 25.5788, longitude: 91.8831 },
  { id: "SN-MEG-TUR-01", name: "Tura Town Slopes", latitude: 25.5140, longitude: 90.2200 },
  { id: "SN-MEG-CHE-01", name: "Cherrapunji Terraced Valleys", latitude: 25.2702, longitude: 91.7323 },
  { id: "SN-MEG-MAW-01", name: "Mawsynram Tribal Hamlets", latitude: 25.3000, longitude: 91.5833 },
  { id: "SN-MEG-EKH-01", name: "East Khasi Hills Connectors", latitude: 25.4200, longitude: 91.9000 },

  // 3. SIKKIM
  { id: "SN-SKM-GAN-01", name: "Gangtok Municipal Slopes", latitude: 27.3314, longitude: 88.6138 },
  { id: "SN-SKM-NAM-01", name: "Namchi Urban Ridge", latitude: 27.1667, longitude: 88.3500 },
  { id: "SN-SKM-MAN-01", name: "Mangan Rural Farming Slopes", latitude: 27.5000, longitude: 88.5167 },
  { id: "SN-SKM-DZO-01", name: "Dzongu Tribal Reserve", latitude: 27.5300, longitude: 88.4800 },
  { id: "SN-SKM-CHU-01", name: "Chungthang Valley Slope", latitude: 27.6042, longitude: 88.6472 },

  // 4. NAGALAND
  { id: "SN-NGL-KOH-01", name: "Kohima Town Ridges", latitude: 25.6751, longitude: 94.1116 },
  { id: "SN-NGL-MOK-01", name: "Mokokchung Urban Slopes", latitude: 26.3263, longitude: 94.5200 },
  { id: "SN-NGL-PHE-01", name: "Phek Hill Farming Villages", latitude: 25.6667, longitude: 94.5000 },
  { id: "SN-NGL-WOK-01", name: "Wokha Terraced Hamlets", latitude: 26.0833, longitude: 94.2500 },
  { id: "SN-NGL-KIP-01", name: "Kiphire Remote Border Tracks", latitude: 25.9000, longitude: 94.7833 },

  // 5. MIZORAM
  { id: "SN-MZR-AIZ-01", name: "Aizawl Capital Ridge Slopes", latitude: 23.7307, longitude: 92.7173 },
  { id: "SN-MZR-LUN-01", name: "Lunglei Municipal Zone", latitude: 22.8864, longitude: 92.7483 },
  { id: "SN-MZR-CHA-01", name: "Champhai Agricultural Slopes", latitude: 23.4757, longitude: 93.3277 },
  { id: "SN-MZR-SER-01", name: "Serchhip Rural Clusters", latitude: 23.3000, longitude: 92.8333 },
  { id: "SN-MZR-LAW-01", name: "Lawngtlai Hill Settlements", latitude: 22.5333, longitude: 92.9000 },

  // 6. MANIPUR
  { id: "SN-MNP-IMP-01", name: "Imphal Valley Border Cuts", latitude: 24.8170, longitude: 93.9368 },
  { id: "SN-MNP-UKH-01", name: "Ukhrul Rural Hamlets", latitude: 25.1167, longitude: 94.4333 },
  { id: "SN-MNP-TAM-01", name: "Tamenglong Tribal Slopes", latitude: 24.9833, longitude: 93.5000 },
  { id: "SN-MNP-SEN-01", name: "Senapati Feeder Tracks", latitude: 25.2667, longitude: 94.0667 },
  { id: "SN-MNP-CHU-01", name: "Churachandpur Hill Clusters", latitude: 24.3333, longitude: 93.6833 },

  // 7. ARUNACHAL PRADESH
  { id: "SN-ARN-ITA-01", name: "Itanagar Capital Slopes", latitude: 27.0844, longitude: 93.6053 },
  { id: "SN-ARN-PAS-01", name: "Pasighat Hill Slopes", latitude: 28.0667, longitude: 95.3333 },
  { id: "SN-ARN-TAW-01", name: "Tawang Valley Settlements", latitude: 27.5849, longitude: 91.8623 },
  { id: "SN-ARN-BOM-01", name: "Bomdila Alpine Hamlets", latitude: 27.2667, longitude: 92.4000 },
  { id: "SN-ARN-ZIR-01", name: "Ziro Valley Farming Slopes", latitude: 27.5500, longitude: 93.8333 },
  { id: "SN-ARN-ANJ-01", name: "Anjaw Border Hamlets", latitude: 28.0500, longitude: 96.8500 },

  // 8. TRIPURA
  { id: "SN-TPR-AGA-01", name: "Agartala Ridge Settlements", latitude: 23.8315, longitude: 91.2868 },
  { id: "SN-TPR-JAM-01", name: "Jampui Hill Slopes", latitude: 23.8500, longitude: 92.2700 },
  { id: "SN-TPR-DHA-01", name: "Dharmanagar Settlement", latitude: 24.3800, longitude: 92.1800 },
  { id: "SN-TPR-DHL-01", name: "Dhalai District Slopes", latitude: 23.8400, longitude: 91.9800 },
];

/**
 * Fetch live real-world weather and soil telemetry for all 41 stations from Open-Meteo.
 */
export async function fetchLiveMeteorologicalTelemetry(): Promise<SensorNodeData[]> {
  const lats = NER_STATIONS.map((s) => s.latitude).join(",");
  const lons = NER_STATIONS.map((s) => s.longitude).join(",");

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=precipitation,rain,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&daily=precipitation_sum,rain_sum&past_days=7&timezone=Asia%2FKolkata`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API returned status ${response.status}`);
  }

  const data = await response.json();
  const nowIso = new Date().toISOString();

  const sensorNodes: SensorNodeData[] = NER_STATIONS.map((stn, idx) => {
    const raw = Array.isArray(data) ? data[idx] : data;
    const dailyPrecips = raw?.daily?.precipitation_sum || [];

    // Indices in past_days=7 daily array:
    // [0..6] = past 7 days, [7] = today's precipitation
    const rain_24h = Number(dailyPrecips[7] ?? (raw?.current?.rain || 0));
    const rain_48h = Number(dailyPrecips[6] ?? 0);
    const rain_72h = Number(dailyPrecips[5] ?? 0);
    const rain_7d = Number(dailyPrecips.slice(0, 8).reduce((a: number, b: number) => a + (b || 0), 0));

    // Calculate Antecedent Precipitation Index (API 7d decay formula: sum(P_i * k^i))
    let api_7d = 0;
    const k = 0.84;
    for (let i = 0; i < 7; i++) {
      const p = dailyPrecips[7 - i] ?? 0;
      api_7d += p * Math.pow(k, i);
    }

    // Soil moisture VWC (m³/m³ * 100)
    const sm0 = raw?.current?.soil_moisture_0_to_1cm ?? 0.30;
    const sm1 = raw?.current?.soil_moisture_1_to_3cm ?? sm0;
    const sm2 = raw?.current?.soil_moisture_9_to_27cm ?? sm1;
    const avgSM = ((sm0 * 0.3 + sm1 * 0.3 + sm2 * 0.4) * 100);

    const sensorNode: SensorNodeData = {
      id: stn.id,
      name: stn.name,
      latitude: stn.latitude,
      longitude: stn.longitude,
      soil_moisture: Math.round(avgSM * 10) / 10,
      rain_24h_obs: Math.round(rain_24h * 10) / 10,
      rain_48h_prior: Math.round(rain_48h * 10) / 10,
      rain_72h_prior: Math.round(rain_72h * 10) / 10,
      rain_7d_prior: Math.round(rain_7d * 10) / 10,
      api_7d: Math.round(api_7d * 10) / 10,
      r24_seasonal_anom: Math.round((rain_24h - 15.0) * 10) / 10,
      api_seasonal_anom: Math.round((api_7d - 45.0) * 10) / 10,
      last_updated: nowIso,
    };

    return sensorNode;
  });

  // Background sync to Supabase so DB stays fresh with live telemetry
  if (supabase && isSupabaseConfigured) {
    try {
      const rows = sensorNodes.map((s) => ({
        id: s.id,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        soil_moisture: s.soil_moisture,
        rain_24h_obs: s.rain_24h_obs,
        rain_48h_prior: s.rain_48h_prior,
        rain_72h_prior: s.rain_72h_prior,
        rain_7d_prior: s.rain_7d_prior,
        api_7d: s.api_7d,
        r24_seasonal_anom: s.r24_seasonal_anom,
        api_seasonal_anom: s.api_seasonal_anom,
        last_updated: s.last_updated,
      }));
      supabase.from("sensor_nodes").upsert(rows, { onConflict: "id" }).then(() => {
        console.log(`[LiveWeather] Synced ${rows.length} live stations to Supabase.`);
      });
    } catch (err) {
      console.warn("[LiveWeather] Supabase background sync notice:", err);
    }
  }

  return sensorNodes;
}
