import React from "react";

interface RiskDialProps {
  score: number; // 1 to 10
  title?: string;
}

export const RiskDial: React.FC<RiskDialProps> = ({ score, title = "24h Landslide Hazard Index" }) => {
  // Ensure score is clamped
  const clampedScore = Math.max(1, Math.min(10, score));

  // Determine color theme based on score
  let color = "text-accentGreen";
  let bgGradient = "from-accentGreen/10 to-accentGreen/5";
  let borderGlow = "border-accentGreen/30 shadow-accentGreen/10";
  let statusText = "LOW (GREEN BASELINE)";
  let protocol = "Normal operations. Monitor localized rainfall.";

  if (clampedScore >= 9) {
    color = "text-accentRed";
    bgGradient = "from-accentRed/20 to-accentRed/5";
    borderGlow = "border-accentRed/40 shadow-accentRed/20 glow-red";
    statusText = "CRITICAL (RED ALERT)";
    protocol = "IMMEDIATE EVACUATION: Segment impassable. Pre-position search & rescue.";
  } else if (clampedScore >= 7) {
    color = "text-accentOrange";
    bgGradient = "from-accentOrange/25 to-accentOrange/5";
    borderGlow = "border-accentOrange/40 shadow-accentOrange/20 glow-orange";
    statusText = "HIGH (ORANGE ALERT)";
    protocol = "SUSPEND TRANSIT: Divert transport. High hazard potential.";
  } else if (clampedScore >= 4) {
    color = "text-accentYellow";
    bgGradient = "from-accentYellow/15 to-accentYellow/5";
    borderGlow = "border-accentYellow/30 shadow-accentYellow/10";
    statusText = "MODERATE (YELLOW ADVISORY)";
    protocol = "CAUTION: Drive with caution. Active rain trigger.";
  }

  // Calculate SVG stroke offset
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 10) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border glass-panel transition-all duration-500 ${borderGlow}`}>
      <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">{title}</h3>
      
      {/* Dynamic Gauge Visualizer */}
      <div className="relative flex items-center justify-center w-36 h-36">
        <svg className="w-full h-full transform -rotate-90">
          {/* Base Background Track */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            className="stroke-gray-800 fill-none"
            strokeWidth="10"
          />
          {/* Active Colored Arc */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            className={`fill-none transition-all duration-1000 ease-out stroke-current ${color}`}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Core Text Info */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-5xl font-black tracking-tight">{clampedScore}</span>
          <span className="text-xs text-gray-500 font-bold uppercase">/ 10 Score</span>
        </div>
      </div>

      {/* Action Protocol Section */}
      <div className={`mt-5 w-full p-4 rounded-xl bg-gradient-to-br ${bgGradient} border border-white/5 text-center`}>
        <div className={`font-bold text-xs uppercase mb-1 tracking-wider ${color}`}>{statusText}</div>
        <p className="text-sm text-gray-200 leading-snug font-medium">{protocol}</p>
      </div>
    </div>
  );
};
