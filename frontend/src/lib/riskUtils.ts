/**
 * riskUtils.ts — Single source of truth for sensor risk computation.
 * Used by GISMap, Dashboard, IoTSensorPage, SensorCorrelationMatrix.
 */

import { SensorNodeData } from "../hooks/useLiveTelemetry";

export interface RiskResult {
  score: number;
  prob: number;
  label: string;
  shortLabel: string;
  color: string;
  tailwindText: string;
  tailwindBg: string;
  tailwindBorder: string;
  isPulsing: boolean;
}

export function computeSensorRisk(s: SensorNodeData): RiskResult {
  const SM   = s.soil_moisture ?? 25.0;
  const rain = s.rain_24h_obs ?? 0.0;
  const api  = s.api_7d ?? 0.0;

  // Pore-water pressure (kPa): u_w ≈ 0.88 * VWC
  const pore = Math.min(120, SM * 0.88);

  // Inclinometer surface velocity (deg/hr): baseline 0.0005 deg/hr under stable slopes
  const incl = Math.min(
    0.12,
    Math.max(
      0.0005,
      (pore > 50 ? (pore - 50) * 0.001 : 0) + (rain > 75 ? (rain - 75) * 0.0005 : 0)
    )
  );

  const logitT = 0.018 * Math.min(rain, 200)
               + 0.005 * Math.min(api, 450)
               + 0.022 * pore
               + 20.0  * incl
               - 1.95;

  const fusedProb = 1 / (1 + Math.exp(-(0.169 * 0.025 + 0.936 * logitT - 0.778)));

  let score: number, label: string, shortLabel: string;
  let color: string, tailwindText: string, tailwindBg: string, tailwindBorder: string, isPulsing: boolean;

  // Physical trigger & probabilistic thresholds aligned with GSI & IMD standards
  // CRITICAL: Extreme rain (>=140mm) OR saturation (>=60% with rain >=120mm) OR high probability (>=0.85)
  if ((rain >= 140 && fusedProb >= 0.70) || (SM >= 60 && rain >= 120) || fusedProb >= 0.85) {
    score = Math.min(10.0, 8.5 + (fusedProb * 1.5));
    label = "CRITICAL RED"; shortLabel = "CRITICAL"; color = "#EF4444";
    tailwindText = "text-alertRed"; tailwindBg = "bg-alertRed/10"; tailwindBorder = "border-alertRed/35"; isPulsing = true;
  } else if ((rain >= 80 && fusedProb >= 0.45) || (SM >= 46 && rain >= 70) || fusedProb >= 0.65) {
    score = Math.min(8.4, 6.8 + (fusedProb * 1.6));
    label = "HIGH ORANGE"; shortLabel = "HIGH"; color = "#F97316";
    tailwindText = "text-alertOrange"; tailwindBg = "bg-alertOrange/10"; tailwindBorder = "border-alertOrange/25"; isPulsing = false;
  } else if (rain >= 35 || SM >= 36 || fusedProb >= 0.30) {
    score = Math.min(6.5, 4.0 + (fusedProb * 2.5));
    label = "CAUTION YELLOW"; shortLabel = "CAUTION"; color = "#F59E0B";
    tailwindText = "text-alertYellow"; tailwindBg = "bg-alertYellow/10"; tailwindBorder = "border-alertYellow/25"; isPulsing = false;
  } else {
    score = Math.max(1.0, (fusedProb * 3.0));
    label = "SAFE GREEN"; shortLabel = "NOMINAL"; color = "#10B981";
    tailwindText = "text-alertGreen"; tailwindBg = "bg-alertGreen/10"; tailwindBorder = "border-alertGreen/20"; isPulsing = false;
  }

  return { score, prob: fusedProb, label, shortLabel, color, tailwindText, tailwindBg, tailwindBorder, isPulsing };
}

export function summarizeRiskCounts(sensors: SensorNodeData[]) {
  let critical = 0, high = 0, caution = 0, nominal = 0;
  for (const s of sensors) {
    const { score } = computeSensorRisk(s);
    if (score >= 8.5)      critical++;
    else if (score >= 6.8) high++;
    else if (score >= 4.0) caution++;
    else                   nominal++;
  }
  return { critical, high, caution, nominal };
}
