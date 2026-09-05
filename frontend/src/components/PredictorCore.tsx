import React, { useState, useEffect } from "react";
import { Sliders, RefreshCw, AlertTriangle, ShieldCheck, HelpCircle, Thermometer } from "lucide-react";

interface PredictorCoreProps {
  onSimulationRun?: (probability: number, riskScore: number) => void;
}

// Preset geomorphic profiles
const PRESETS = [
  {
    name: "Aizawl Municipal Slope (Steep Urban)",
    slope: 42.0,
    elevation: 1650,
    curvature: 0.082,
    distToRoad: 0.02, // 20 meters
    aspect: 0.85, // Sin orientation
  },
  {
    name: "Dima Hasao Tribal Village (Medium Rural)",
    slope: 35.5,
    elevation: 980,
    curvature: 0.045,
    distToRoad: 0.15, // 150 meters
    aspect: 0.45,
  },
  {
    name: "NH-10 Kalimpong Link (Extreme Cut Slope)",
    slope: 48.0,
    elevation: 1100,
    curvature: 0.125,
    distToRoad: 0.005, // 5 meters
    aspect: 0.95,
  },
  {
    name: "Cherrapunji Terraced Agriculture (Gentle)",
    slope: 18.5,
    elevation: 1380,
    curvature: 0.012,
    distToRoad: 0.45, // 450 meters
    aspect: 0.25,
  }
];

export const PredictorCore: React.FC<PredictorCoreProps> = ({ onSimulationRun }) => {
  // 1. Geomorphic Slope Configuration (Static)
  const [slope, setSlope] = useState<number>(42.0);
  const [elevation, setElevation] = useState<number>(1650);
  const [curvature, setCurvature] = useState<number>(0.082);
  const [distToRoad, setDistToRoad] = useState<number>(0.02);
  const [aspect, setAspect] = useState<number>(0.85);

  // 2. Meteorological & Hydrological Spikes (Dynamic Sliders)
  const [rain24h, setRain24h] = useState<number>(120);      // 0 - 300 mm
  const [porePressure, setPorePressure] = useState<number>(45);  // 0 - 100 kPa
  const [inclinometer, setInclinometer] = useState<number>(0.02);  // 0 - 0.12 °/hr
  const [api7d, setApi7d] = useState<number>(145);          // 0 - 350 mm

  // Computed variables
  const [logitS, setLogitS] = useState<number>(0);
  const [logitT, setLogitT] = useState<number>(0);
  const [probability, setProbability] = useState<number>(0);
  const [riskScore, setRiskScore] = useState<number>(1);

  // Run two-tier risk calculations
  useEffect(() => {
    // Standard static susceptibility logit(S)
    const sVal = (0.045 * slope) + (0.0003 * elevation) + (1.2 * curvature) - (1.8 * distToRoad) + (0.15 * aspect) - 1.25;
    
    // Dynamic trigger threat logit(T)
    const tVal = (0.018 * rain24h) + (0.005 * api7d) + (0.022 * porePressure) + (20.0 * inclinometer) - 1.95;

    // Calibrated Fused Risk Probability:
    // P = 1 / (1 + exp(-(0.169 * logit(S) + 0.936 * logit(T) - 0.778)))
    const logitFused = (0.169 * sVal) + (0.936 * tVal) - 0.778;
    const probVal = 1 / (1 + Math.exp(-logitFused));

    // Map probability to standardized 1 - 10 risk rating
    // Green (1-3): P <= 0.15 | Yellow (4-6): P <= 0.50 | Orange (7-8): P <= 0.80 | Red (9-10): P > 0.80
    let score = 1;
    if (probVal <= 0.15) {
      score = Math.max(1, Math.round(probVal * 20)); // scale 0-0.15 to 1-3
    } else if (probVal <= 0.50) {
      score = Math.max(4, 4 + Math.round(((probVal - 0.15) / 0.35) * 2)); // scale 0.15-0.50 to 4-6
    } else if (probVal <= 0.80) {
      score = Math.max(7, 7 + Math.round(((probVal - 0.50) / 0.30) * 1)); // scale 0.50-0.80 to 7-8
    } else {
      score = Math.max(9, 9 + Math.round(((probVal - 0.80) / 0.20) * 1)); // scale 0.80-1.00 to 9-10
    }

    const finalProb = parseFloat(probVal.toFixed(4));
    const finalScore = Math.min(10, Math.max(1, score));

    setLogitS(parseFloat(sVal.toFixed(3)));
    setLogitT(parseFloat(tVal.toFixed(3)));
    setProbability(finalProb);
    setRiskScore(finalScore);

    if (onSimulationRun) {
      onSimulationRun(finalProb, finalScore);
    }
  }, [slope, elevation, curvature, distToRoad, aspect, rain24h, porePressure, inclinometer, api7d]);

  const loadPreset = (preset: typeof PRESETS[0]) => {
    setSlope(preset.slope);
    setElevation(preset.elevation);
    setCurvature(preset.curvature);
    setDistToRoad(preset.distToRoad);
    setAspect(preset.aspect);
  };

  // Get alert configurations based on risk score
  const getAlertConfig = (score: number) => {
    if (score >= 9) return {
      color: "text-alertRed bg-alertRed/10 border-alertRed/20",
      iconColor: "text-alertRed animate-pulse",
      title: "Level 9-10: CRITICAL RED ALERT",
      protocol: "🚨 SOP MANDATE: Evacuate local settlements immediately. Alert district disaster cells. Suspend all transit. Dispatch search-and-rescue machinery to pre-positioned locations."
    };
    if (score >= 7) return {
      color: "text-alertOrange bg-alertOrange/10 border-alertOrange/20",
      iconColor: "text-alertOrange",
      title: "Level 7-8: HIGH ORANGE WARNING",
      protocol: "⚠️ SOP MANDATE: Restrict highway connectivity. Pre-position emergency clearing equipment. Divert tourist transits. Standby local village rescue grids."
    };
    if (score >= 4) return {
      color: "text-alertYellow bg-alertYellow/10 border-alertYellow/20",
      iconColor: "text-alertYellow",
      title: "Level 4-6: MODERATE YELLOW ADVISORY",
      protocol: "📢 SOP MANDATE: Caution advised on cuts and cuttings. Speed limits restricted to 20km/h. Alert localized road maintenance crews."
    };
    return {
      color: "text-alertGreen bg-alertGreen/10 border-alertGreen/20",
      iconColor: "text-alertGreen",
      title: "Level 1-3: LOW GREEN BASELINE",
      protocol: "✅ SOP MANDATE: Normal weather monitoring active. Perform daily in-situ sensor sweeps and satellite rain audits."
    };
  };

  const alertConfig = getAlertConfig(riskScore);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Col 1: Static Susceptibility Configuration */}
      <div className="glass-panel rounded-2xl p-5 bg-bgCard space-y-4">
        <div>
          <h3 className="font-extrabold text-sm text-textPrimary uppercase flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" /> Geomorphic Parameters
          </h3>
          <p className="text-[10px] text-textSecondary">Configure physical attributes of the slope sector</p>
        </div>

        {/* Presets dropdown */}
        <div>
          <label className="text-[9px] font-bold text-textMuted uppercase tracking-wider block mb-1">Load Terrain Preset Profile</label>
          <select
            onChange={(e) => loadPreset(PRESETS[parseInt(e.target.value)])}
            className="w-full px-3 py-1.5 rounded-lg bg-bgPrimary border border-borderColor text-xs text-textPrimary focus:outline-none"
          >
            {PRESETS.map((p, idx) => (
              <option key={idx} value={idx}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3 pt-2">
          {/* Slope Angle */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-0.5">
              <span>Slope Gradient Angle</span>
              <span className="font-mono text-textPrimary">{slope.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="10.0"
              max="60.0"
              step="0.5"
              value={slope}
              onChange={(e) => setSlope(parseFloat(e.target.value))}
              className="w-full accent-blue-600 bg-borderColor h-1 rounded"
            />
          </div>

          {/* Elevation */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-0.5">
              <span>Elevation MSL</span>
              <span className="font-mono text-textPrimary">{elevation} m</span>
            </div>
            <input
              type="range"
              min="100"
              max="2800"
              step="50"
              value={elevation}
              onChange={(e) => setElevation(parseInt(e.target.value))}
              className="w-full accent-blue-600 bg-borderColor h-1 rounded"
            />
          </div>

          {/* Curvature */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-0.5">
              <span>Slope Curvature Rate</span>
              <span className="font-mono text-textPrimary">{curvature.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="-0.05"
              max="0.25"
              step="0.005"
              value={curvature}
              onChange={(e) => setCurvature(parseFloat(e.target.value))}
              className="w-full accent-blue-600 bg-borderColor h-1 rounded"
            />
          </div>

          {/* Distance to Road */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-0.5">
              <span>Distance to Infrastructure</span>
              <span className="font-mono text-textPrimary">{Math.round(distToRoad * 1000)} m</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.8"
              step="0.005"
              value={distToRoad}
              onChange={(e) => setDistToRoad(parseFloat(e.target.value))}
              className="w-full accent-blue-600 bg-borderColor h-1 rounded"
            />
          </div>
        </div>
      </div>

      {/* Col 2: Meteorological Spikes (Dynamic Sliders) */}
      <div className="glass-panel rounded-2xl p-5 bg-bgCard space-y-4">
        <div>
          <h3 className="font-extrabold text-sm text-textPrimary uppercase flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-500 animate-pulse-slow" /> What-If Meteorological Triggers
          </h3>
          <p className="text-[10px] text-textSecondary">Simulate sudden rainfall accumulation or pore spikes</p>
        </div>

        <div className="space-y-3 pt-1">
          {/* 24h Rain Depth */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-0.5">
              <span>24h observed Precipitation</span>
              <span className="font-mono text-alertOrange font-black">{rain24h} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="300"
              value={rain24h}
              onChange={(e) => setRain24h(parseInt(e.target.value))}
              className="w-full accent-amber-500 bg-borderColor h-1 rounded"
            />
          </div>

          {/* 7-Day API */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-0.5">
              <span>7-Day Antecedent Index (API_7d)</span>
              <span className="font-mono text-textPrimary">{api7d} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="350"
              value={api7d}
              onChange={(e) => setApi7d(parseInt(e.target.value))}
              className="w-full accent-amber-500 bg-borderColor h-1 rounded"
            />
          </div>

          {/* Pore-Water Pressure */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-0.5">
              <span>Piezometer Pore Pressure</span>
              <span className="font-mono text-alertRed font-black">{porePressure} kPa</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={porePressure}
              onChange={(e) => setPorePressure(parseInt(e.target.value))}
              className="w-full accent-amber-500 bg-borderColor h-1 rounded"
            />
          </div>

          {/* Inclinometer Drift */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-0.5">
              <span>Inclinometer Angular Drift</span>
              <span className="font-mono text-red-500 font-bold">{inclinometer.toFixed(2)} °/hr</span>
            </div>
            <input
              type="range"
              min="0.00"
              max="0.12"
              step="0.005"
              value={inclinometer}
              onChange={(e) => setInclinometer(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-borderColor h-1 rounded"
            />
          </div>
        </div>
      </div>

      {/* Col 3: Neural Fusion Results Display */}
      <div className="glass-panel rounded-2xl p-5 bg-bgCard flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-sm text-textPrimary uppercase flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-purple-500" /> AI Neural Fusion Calculator
          </h3>
          <p className="text-[10px] text-textSecondary mb-4">Live calibrated risk calculation feed</p>
        </div>

        {/* Fused Risk Level Score */}
        <div className="my-auto py-4 text-center">
          <div className="inline-block relative">
            <span className="text-6xl font-black tracking-tighter text-textPrimary">{riskScore}</span>
            <span className="text-xs text-textMuted uppercase font-bold absolute -bottom-1 -right-8">/10</span>
          </div>
          <p className="text-xs text-textSecondary font-bold mt-1">Calibrated Failure Risk Index</p>
          <div className="text-[10px] text-textMuted mt-2 flex justify-center gap-3 font-mono">
            <span>logit(S): <strong>{logitS}</strong></span>
            <span>logit(T): <strong>{logitT}</strong></span>
          </div>
        </div>

        {/* SOP Card */}
        <div className={`p-4 rounded-xl border ${alertConfig.color} space-y-2 mt-auto`}>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
            <AlertTriangle className={`w-4 h-4 ${alertConfig.iconColor}`} />
            <span>{alertConfig.title}</span>
          </div>
          <div className="text-[11px] font-semibold leading-relaxed">
            {alertConfig.protocol}
          </div>
          <div className="text-[9px] text-textSecondary pt-1 border-t border-current/10 flex justify-between font-mono">
            <span>24h Probability: <strong>{(probability * 100).toFixed(2)}%</strong></span>
            <span>Fused Formula OK</span>
          </div>
        </div>

      </div>

    </div>
  );
};
