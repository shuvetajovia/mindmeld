import React from "react";

interface RiskDialProps {
  score: number; // 1 to 10
  title?: string;
}

export const RiskDial: React.FC<RiskDialProps> = ({ score, title = "24h Landslide Hazard Index" }) => {
  // Ensure score is clamped
  const clampedScore = Math.max(1, Math.min(10, score));

  // Determine color theme based on score
  let color = "text-alertGreen";
  let bgGradient = "bg-alertGreen/10 border-alertGreen/30";
  let borderGlow = "border-alertGreen/40 shadow-alertGreen/10";
  let statusText = "LOW (GREEN BASELINE)";
  let protocol = "Normal operations. Continuous telemetry baseline.";

  if (clampedScore >= 9) {
    color = "text-alertRed";
    bgGradient = "bg-alertRed/15 border-alertRed/40";
    borderGlow = "border-alertRed/50 shadow-alertRed/20 halo-red";
    statusText = "CRITICAL (RED ALERT)";
    protocol = "IMMEDIATE EVACUATION: Segment impassable. Pre-position search & rescue.";
  } else if (clampedScore >= 7) {
    color = "text-alertOrange";
    bgGradient = "bg-alertOrange/15 border-alertOrange/40";
    borderGlow = "border-alertOrange/50 shadow-alertOrange/20 halo-orange";
    statusText = "HIGH (ORANGE ALERT)";
    protocol = "SUSPEND TRANSIT: Divert transport. High hazard potential.";
  } else if (clampedScore >= 4) {
    color = "text-alertYellow";
    bgGradient = "bg-alertYellow/15 border-alertYellow/40";
    borderGlow = "border-alertYellow/40 shadow-alertYellow/10 halo-yellow";
    statusText = "MODERATE (YELLOW ADVISORY)";
    protocol = "CAUTION: Drive with caution. Active rain trigger.";
  }

  // Calculate SVG stroke offset
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 10) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center p-5 rounded-2xl border bg-bgCard shadow-lg transition-all duration-300 ${borderGlow}`}>
      <h3 className="text-textMuted text-[10px] font-black mb-3 uppercase tracking-wider text-center">{title}</h3>
      
      {/* Dynamic Gauge Visualizer */}
      <div className="relative flex items-center justify-center w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          {/* Base Background Track */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            className="stroke-borderColor fill-none"
            strokeWidth="10"
          />
          {/* Active Colored Arc */}
          <circle
            cx="64"
            cy="64"
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
          <span className="text-4xl font-black text-textPrimary tracking-tight">{clampedScore.toFixed(1)}</span>
          <span className="text-[10px] text-textMuted font-black uppercase">/ 10 Score</span>
        </div>
      </div>

      {/* Action Protocol Section */}
      <div className={`mt-4 w-full p-3 rounded-xl border text-center ${bgGradient}`}>
        <div className={`font-black text-xs uppercase mb-1 tracking-wider ${color}`}>{statusText}</div>
        <p className="text-xs text-textPrimary leading-snug font-bold">{protocol}</p>
      </div>
    </div>
  );
};
