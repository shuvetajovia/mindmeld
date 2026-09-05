import React from "react";
import { ShieldAlert, Users, Radio, Home, ArrowRight } from "lucide-react";
import { SensorNodeData } from "../hooks/useLiveTelemetry";

interface StateResilienceWidgetProps {
  sensors: SensorNodeData[];
  selectedState: string;
  onStateSelect: (stateName: string) => void;
}

interface StateMetadata {
  name: string;
  filterKey: string;
  code: string;
  populationAtRisk: number;
  shelters: string;
}

const STATES_METADATA: StateMetadata[] = [
  { name: "Assam", filterKey: "ASSAM", code: "ASM", populationAtRisk: 125000, shelters: "6 Active / 4 Standby" },
  { name: "Meghalaya", filterKey: "MEG", code: "MEG", populationAtRisk: 78000, shelters: "3 Active / 2 Standby" },
  { name: "Sikkim", filterKey: "SIKKIM", code: "SKM", populationAtRisk: 45000, shelters: "4 Active / 2 Standby" },
  { name: "Nagaland", filterKey: "NGL", code: "NGL", populationAtRisk: 64000, shelters: "2 Active / 3 Standby" },
  { name: "Mizoram", filterKey: "MIZORAM", code: "MZR", populationAtRisk: 55000, shelters: "4 Active / 1 Standby" },
  { name: "Manipur", filterKey: "MANIPUR", code: "MNP", populationAtRisk: 82000, shelters: "3 Active / 3 Standby" },
  { name: "Arunachal", filterKey: "ARUNACHAL", code: "ARN", populationAtRisk: 38000, shelters: "2 Active / 2 Standby" },
  { name: "Tripura", filterKey: "TRIPURA", code: "TPR", populationAtRisk: 29000, shelters: "1 Active / 2 Standby" }
];

export const StateResilienceWidget: React.FC<StateResilienceWidgetProps> = ({ 
  sensors, 
  selectedState, 
  onStateSelect 
}) => {

  // Per-state representative geomorphic baselines (slope, elevation, curvature, distToRoad, aspect)
  const STATE_GEOMORPHICS: Record<string, { slope: number; elev: number; curv: number; dist: number; aspect: number }> = {
    ASM:  { slope: 32.5, elev: 780,  curv: 0.055, dist: 0.12, aspect: 0.62 },
    MEG:  { slope: 28.0, elev: 1380, curv: 0.038, dist: 0.18, aspect: 0.45 },
    SKM:  { slope: 44.5, elev: 1650, curv: 0.112, dist: 0.04, aspect: 0.88 },
    NGL:  { slope: 39.5, elev: 1440, curv: 0.095, dist: 0.06, aspect: 0.78 },
    MZR:  { slope: 42.0, elev: 1220, curv: 0.082, dist: 0.02, aspect: 0.85 },
    MNP:  { slope: 36.5, elev: 1180, curv: 0.068, dist: 0.09, aspect: 0.70 },
    ARN:  { slope: 41.0, elev: 2100, curv: 0.102, dist: 0.05, aspect: 0.92 },
    TPR:  { slope: 24.5, elev: 620,  curv: 0.032, dist: 0.25, aspect: 0.38 },
  };

  const computeStateRisk = (code: string, filterKey: string) => {
    const matchedSensors = sensors.filter(s => {
      const n = s.name.toLowerCase();
      if (filterKey === "ASSAM" && (n.includes("guwahati") || n.includes("silchar") || n.includes("dima hasao") || n.includes("lumding"))) return true;
      if (filterKey === "MEG" && (n.includes("shillong") || n.includes("tura") || n.includes("cherrapunji") || n.includes("mawsynram"))) return true;
      if (filterKey === "SIKKIM" && (n.includes("gangtok") || n.includes("namchi") || n.includes("mangan") || n.includes("chungthang"))) return true;
      if (filterKey === "NGL" && (n.includes("kohima") || n.includes("mokokchung") || n.includes("phek"))) return true;
      if (filterKey === "MIZORAM" && (n.includes("aizawl") || n.includes("lunglei") || n.includes("champhai"))) return true;
      if (filterKey === "MANIPUR" && (n.includes("imphal") || n.includes("ukhrul") || n.includes("tamenglong"))) return true;
      if (filterKey === "ARUNACHAL" && (n.includes("itanagar") || n.includes("pasighat") || n.includes("tawang"))) return true;
      if (filterKey === "TRIPURA" && (n.includes("agartala") || n.includes("dharmanagar") || n.includes("dhalai"))) return true;
      return false;
    });
    if (matchedSensors.length === 0) return { maxRisk: 1.0, count: 0 };

    const geo = STATE_GEOMORPHICS[code] || STATE_GEOMORPHICS.ASM;
    // logit(S) — static slope susceptibility
    const sVal = (0.045 * geo.slope) + (0.0003 * geo.elev) + (1.2 * geo.curv) - (1.8 * geo.dist) + (0.15 * geo.aspect) - 1.25;

    let maxRisk = 1.0;
    matchedSensors.forEach(s => {
      const rain = s.rain_24h_obs;
      const api  = s.api_7d;
      const SM   = s.soil_moisture;
      // Derive approximate pore pressure from soil moisture
      const pore = Math.min(120, SM * 0.9);
      // Approximate inclinometer from rain + pore
      const incl = Math.min(0.12, (pore * 0.00055 + rain * 0.00025));
      // logit(T) — dynamic hydro trigger
      const tVal = (0.018 * rain) + (0.005 * api) + (0.022 * pore) + (20.0 * incl) - 1.95;
      // Fused probability
      const logitF = (0.169 * sVal) + (0.936 * tVal) - 0.778;
      const prob   = 1 / (1 + Math.exp(-logitF));
      // Map to 1–10 index
      let score = 1;
      if (prob <= 0.15)      score = Math.max(1, Math.round(prob * 20));
      else if (prob <= 0.50) score = Math.max(4, 4 + Math.round(((prob - 0.15) / 0.35) * 2));
      else if (prob <= 0.80) score = 7 + Math.round(((prob - 0.50) / 0.30));
      else                   score = 9 + Math.round(((prob - 0.80) / 0.20));
      const risk = Math.min(10, Math.max(1, score));
      if (risk > maxRisk) maxRisk = risk;
    });

    return { maxRisk, count: matchedSensors.length };
  };

  const getAlertStyle = (risk: number) => {
    if (risk >= 9.0) return { border: "border-l-4 border-l-alertRed", bg: "bg-alertRed/5 hover:bg-alertRed/10", text: "text-alertRed", label: "Critical" };
    if (risk >= 7.0) return { border: "border-l-4 border-l-alertOrange", bg: "bg-alertOrange/5 hover:bg-alertOrange/10", text: "text-alertOrange", label: "High Alert" };
    if (risk >= 4.0) return { border: "border-l-4 border-l-alertYellow", bg: "bg-alertYellow/5 hover:bg-alertYellow/10", text: "text-alertYellow", label: "Cautionary" };
    return { border: "border-l-4 border-l-alertGreen", bg: "bg-alertGreen/5 hover:bg-alertGreen/10", text: "text-alertGreen", label: "Nominal" };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-borderColor pb-2">
        <div>
          <h3 className="font-extrabold text-xs text-textPrimary uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-blue-600 animate-pulse" /> State-Wise Resilience Index Board
          </h3>
          <p className="text-[9px] text-textSecondary">Click a state card below to filter coordinates dynamically on the GIS Grid</p>
        </div>
        {selectedState !== "ALL" && (
          <button 
            onClick={() => onStateSelect("ALL")}
            className="px-2 py-0.5 rounded-lg border border-borderColor hover:bg-borderColor/30 text-[9px] font-black uppercase text-blue-600 transition"
          >
            Clear Filter [×]
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {STATES_METADATA.map((state) => {
          const { maxRisk, count } = computeStateRisk(state.code, state.filterKey);
          const style = getAlertStyle(maxRisk);
          const isSelected = selectedState === state.filterKey;

          return (
            <button
              key={state.filterKey}
              onClick={() => onStateSelect(state.filterKey)}
              className={`text-left rounded-xl p-2.5 transition-all duration-300 transform hover:-translate-y-0.5 flex flex-col justify-between h-[104px] border ${
                isSelected 
                  ? "border-blue-600 ring-2 ring-blue-600/10 bg-blue-500/5 shadow-md" 
                  : `border-borderColor bg-bgCard ${style.border}`
              } ${style.bg}`}
            >
              {/* Header: State & Alert status */}
              <div className="w-full flex items-start justify-between">
                <span className="font-extrabold text-[10px] text-textPrimary truncate" title={state.name}>
                  {state.name}
                </span>
                <span className={`text-[8px] font-black uppercase ${style.text}`}>
                  {style.label}
                </span>
              </div>

              {/* Index Value */}
              <div className="my-1.5">
                <div className="text-base font-black tracking-tight font-mono text-textPrimary">
                  {maxRisk.toFixed(1)}
                  <span className="text-[9px] font-semibold text-textMuted font-sans">/10</span>
                </div>
              </div>

              {/* Footer specs */}
              <div className="space-y-0.5 text-[8px] font-bold text-textSecondary w-full">
                <div className="flex items-center justify-between">
                  <span className="text-textMuted flex items-center gap-0.5"><Radio className="w-2.5 h-2.5 shrink-0" /> IoT:</span>
                  <span>{count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-textMuted flex items-center gap-0.5"><Users className="w-2.5 h-2.5 shrink-0" /> Risk:</span>
                  <span className="font-mono">{(state.populationAtRisk / 1000).toFixed(0)}k</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-textMuted flex items-center gap-0.5"><Home className="w-2.5 h-2.5 shrink-0" /> Shelter:</span>
                  <span className="truncate text-right max-w-[40px]" title={state.shelters}>{state.shelters.split(" ")[0]}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
