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
  const SM   = s.soil_moisture;
  const rain = s.rain_24h_obs;
  const api  = s.api_7d ?? 0;

  const pore = Math.min(120, SM * 0.88);
  const incl = Math.min(0.12, pore * 0.00045 + rain * 0.00018);

  const logitT = 0.018 * Math.min(rain, 200)
               + 0.005 * Math.min(api, 450)
               + 0.022 * pore
               + 20.0  * incl
               - 1.95;

  const fusedProb = 1 / (1 + Math.exp(-(0.169 * 0.025 + 0.936 * logitT - 0.778)));

  let score: number, label: string, shortLabel: string;
  let color: string, tailwindText: string, tailwindBg: string, tailwindBorder: string, isPulsing: boolean;

  if (fusedProb > 0.78 && (rain > 130 || SM > 58)) {
    score = 9.2; label = "CRITICAL RED"; shortLabel = "CRITICAL"; color = "#EF4444";
    tailwindText = "text-alertRed"; tailwindBg = "bg-alertRed/10"; tailwindBorder = "border-alertRed/35"; isPulsing = true;
  } else if (fusedProb > 0.50 && (rain > 80 || SM > 46)) {
    score = 7.5; label = "HIGH ORANGE"; shortLabel = "HIGH"; color = "#F97316";
    tailwindText = "text-alertOrange"; tailwindBg = "bg-alertOrange/10"; tailwindBorder = "border-alertOrange/25"; isPulsing = false;
  } else if (fusedProb > 0.18 || rain > 40 || SM > 36) {
    score = 4.8; label = "CAUTION YELLOW"; shortLabel = "CAUTION"; color = "#F59E0B";
    tailwindText = "text-alertYellow"; tailwindBg = "bg-alertYellow/10"; tailwindBorder = "border-alertYellow/25"; isPulsing = false;
  } else {
    score = 2.1; label = "SAFE GREEN"; shortLabel = "NOMINAL"; color = "#10B981";
    tailwindText = "text-alertGreen"; tailwindBg = "bg-alertGreen/10"; tailwindBorder = "border-alertGreen/20"; isPulsing = false;
  }

  return { score, prob: fusedProb, label, shortLabel, color, tailwindText, tailwindBg, tailwindBorder, isPulsing };
}

export function summarizeRiskCounts(sensors: SensorNodeData[]) {
  let critical = 0, high = 0, caution = 0, nominal = 0;
  for (const s of sensors) {
    const { score } = computeSensorRisk(s);
    if (score >= 9)      critical++;
    else if (score >= 7) high++;
    else if (score >= 4) caution++;
    else                 nominal++;
  }
  return { critical, high, caution, nominal };
}
