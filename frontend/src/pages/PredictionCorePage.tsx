import React, { useState } from "react";
import { Sliders, RefreshCw, Cpu, Info, BookOpen } from "lucide-react";
import { useLiveTelemetry } from "../hooks/useLiveTelemetry";
import { AlertsBanner } from "../components/AlertsBanner";
import { PredictorCore } from "../components/PredictorCore";

interface PredictionCorePageProps {
  apiBaseUrl: string;
}

export const PredictionCorePage: React.FC<PredictionCorePageProps> = ({ apiBaseUrl }) => {
  const { alerts, refresh } = useLiveTelemetry(apiBaseUrl, 15000);
  const [showFormula, setShowFormula] = useState<boolean>(false);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-textPrimary flex flex-col min-h-[calc(100vh-100px)]">
      {/* Active Alerts Banner */}
      <AlertsBanner alerts={alerts} />

      {/* Page Title Header */}
      <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 shrink-0 shadow-sm border border-blue-600/15">
            <Cpu className="w-6 h-6 animate-pulse-slow" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-textPrimary uppercase">Two-Tier ML Prediction Core & What-If Simulator</h2>
            <p className="text-[10px] text-textSecondary leading-snug">
              Calibrate static geomorphic susceptibility + monsoonal dynamic triggers to compute risk ratings in real time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowFormula(prev => !prev)}
            className="px-3 py-2 border border-borderColor bg-bgPrimary hover:bg-borderColor/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            {showFormula ? "Hide Formula" : "Show Fusion Formula"}
          </button>
          <button
            onClick={refresh}
            className="px-3 py-2 border border-borderColor bg-bgPrimary hover:bg-borderColor/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-textSecondary" />
            Refresh
          </button>
        </div>
      </div>

      {/* Expandable Fusion Formula Panel */}
      {showFormula && (
        <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-blue-500/20 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 border-b border-borderColor pb-2">
            <Info className="w-4 h-4 text-blue-600" />
            <h3 className="font-extrabold text-xs text-textPrimary uppercase">Meta-Calibrator Fusion Formula (MindMeld Multi-Tier ML Engine)</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-bgPrimary border border-borderColor rounded-xl space-y-2">
              <div className="text-[8px] font-black text-purple-600 uppercase tracking-wider mb-1">
                Tier 1 — Static Susceptibility logit(S)
              </div>
              <div className="font-mono text-[10px] text-textSecondary leading-relaxed bg-bgCard border border-borderColor rounded-lg p-2.5">
                logit(S) = 0.045 × <strong>slope</strong> +<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0.0003 × <strong>elev</strong> +<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1.2 × <strong>curv</strong> −<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1.8 × <strong>dist</strong> +<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0.15 × <strong>aspect</strong> − 1.25
              </div>
              <p className="text-[9px] text-textMuted font-semibold">
                Driven by geomorphology: slope angle, elevation, curvature, road proximity, and solar aspect from 30m SRTM DEM.
              </p>
            </div>

            <div className="p-4 bg-bgPrimary border border-borderColor rounded-xl space-y-2">
              <div className="text-[8px] font-black text-blue-600 uppercase tracking-wider mb-1">
                Tier 2 — Hydro-Geotech Trigger logit(T)
              </div>
              <div className="font-mono text-[10px] text-textSecondary leading-relaxed bg-bgCard border border-borderColor rounded-lg p-2.5">
                logit(T) = 0.018 × <strong>r24</strong> +<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0.005 × <strong>api7d</strong> +<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0.022 × <strong>pore</strong> +<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;20.0 × <strong>incl</strong> − 1.95
              </div>
              <p className="text-[9px] text-textMuted font-semibold">
                Driven by rainfall (24h, API 7d), piezometer pore pressure, and MEMS inclinometer drift from in-situ IoT sensors.
              </p>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2">
              <div className="text-[8px] font-black text-blue-600 uppercase tracking-wider mb-1">
                Fused Failure Probability P
              </div>
              <div className="font-mono text-[10px] text-textSecondary leading-relaxed bg-bgCard border border-borderColor rounded-lg p-2.5">
                <strong className="text-blue-600">P = σ( 0.169 × logit(S)</strong><br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong className="text-blue-600">+ 0.936 × logit(T)</strong><br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong className="text-blue-600">− 0.778 )</strong>
              </div>
              <div className="space-y-1 text-[9px] text-textMuted font-semibold">
                <p>σ(x) = sigmoid function = 1 / (1 + e^−x)</p>
                <p>The logit(T) weight (0.936) dominates: <strong>dynamic monsoon trigger is the primary driver</strong> of the final failure probability, with geomorphology as a spatial modulator.</p>
              </div>
              <div className="mt-2 p-2 rounded bg-bgCard border border-borderColor text-[8px] font-mono grid grid-cols-2 gap-1 text-textMuted">
                <span>P ≤ 0.15 → Risk 1–3 (Green)</span>
                <span>P ≤ 0.50 → Risk 4–6 (Yellow)</span>
                <span>P ≤ 0.80 → Risk 7–8 (Orange)</span>
                <span>P &gt; 0.80 → Risk 9–10 (Red)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* What-If ML Simulator */}
      <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-borderColor pb-2">
          <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 shrink-0">
            <Sliders className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-extrabold text-xs text-textPrimary uppercase">Interactive What-If Threat Sandbox</h3>
            <p className="text-[9px] text-textSecondary">
              Adjust slope parameters and weather triggers to see real-time risk index shifts via the two-tier ML model
            </p>
          </div>
        </div>
        <PredictorCore />
      </div>
    </div>
  );
};
