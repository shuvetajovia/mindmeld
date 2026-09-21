import React, { useState } from "react";
import { Shield, AlertCircle, XOctagon, ToggleLeft, RefreshCw } from "lucide-react";
import { CorridorData } from "../hooks/useLiveTelemetry";

interface RoadCorridorStatusProps {
  corridors: CorridorData[];
  apiBaseUrl: string;
  onRefresh: () => void;
  isAdmin?: boolean;
}

export const RoadCorridorStatus: React.FC<RoadCorridorStatusProps> = ({ 
  corridors, 
  apiBaseUrl, 
  onRefresh, 
  isAdmin = true 
}) => {
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const handleStatusOverride = async (segmentId: number, currentStatus: string) => {
    // Cycle through OPEN -> CAUTION -> BLOCKED -> OPEN
    let nextStatus = "OPEN";
    if (currentStatus === "OPEN") nextStatus = "CAUTION";
    else if (currentStatus === "CAUTION") nextStatus = "BLOCKED";

    setUpdatingId(segmentId);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/corridors/${segmentId}/override?status_override=${nextStatus}`, {
        method: "POST",
      });
      if (response.ok) {
        onRefresh();
      } else {
        console.error("Failed to override status");
      }
    } catch (e) {
      console.error("Override network error:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "BLOCKED":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-accentRed/15 text-accentRed border border-accentRed/30 glow-red">
            <XOctagon className="w-3.5 h-3.5" /> IMPASSABLE
          </span>
        );
      case "CAUTION":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-accentYellow/15 text-accentYellow border border-accentYellow/30">
            <AlertCircle className="w-3.5 h-3.5" /> CAUTION
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-accentGreen/15 text-accentGreen border border-accentGreen/30">
            <Shield className="w-3.5 h-3.5" /> OPERATIONAL
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-cardBorder bg-cardBg/60 p-6 glass-panel flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">National Highway Corridors</h2>
          <p className="text-xs text-gray-400">Real-time status summaries for key transit links in the NER</p>
        </div>
        <button 
          onClick={onRefresh}
          className="p-2 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 transition"
        >
          <RefreshCw className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      <div className="overflow-y-auto flex-grow max-h-[350px] space-y-4 pr-1">
        {corridors.map((c) => (
          <div key={c.name} className="p-4 rounded-xl bg-gray-900/50 border border-cardBorder hover:border-gray-700 transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white">{c.name}</span>
                <span className="text-xs text-gray-500 font-semibold">{c.length_km} km</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Max Risk: {c.max_risk.toFixed(1)}</span>
                {getStatusBadge(c.status)}
              </div>
            </div>

            {/* List of sub-sections */}
            <div className="mt-2 divide-y divide-gray-800">
              {c.sections.map((sec) => (
                <div key={sec.id} className="py-2.5 flex items-center justify-between text-sm gap-2">
                  <div className="flex-grow">
                    <div className="font-semibold text-gray-200">{sec.section}</div>
                    <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                      <span>{sec.length_km} km</span>
                      <span>•</span>
                      <span>Risk: {sec.risk_score.toFixed(1)}/10</span>
                      <span>•</span>
                      <span>P: {(sec.risk_probability * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs">{getStatusBadge(sec.status)}</span>
                    {isAdmin && (
                      <button
                        disabled={updatingId === sec.id}
                        onClick={() => handleStatusOverride(sec.id, sec.status)}
                        className="p-1.5 rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-400 hover:text-white transition disabled:opacity-50"
                        title="Override Operational Status"
                      >
                        <ToggleLeft className={`w-4 h-4 ${updatingId === sec.id ? "animate-spin" : ""}`} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
