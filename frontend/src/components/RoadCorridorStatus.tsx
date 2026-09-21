import React, { useState } from "react";
import { Shield, AlertCircle, XOctagon, ToggleLeft, RefreshCw, ChevronRight } from "lucide-react";
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
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-alertRed/15 text-alertRed border border-alertRed/40 shadow-sm">
            <XOctagon className="w-3.5 h-3.5" /> IMPASSABLE
          </span>
        );
      case "CAUTION":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-alertYellow/15 text-alertYellow border border-alertYellow/40 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5" /> CAUTION
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-alertGreen/15 text-alertGreen border border-alertGreen/40 shadow-sm">
            <Shield className="w-3.5 h-3.5" /> OPERATIONAL
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-borderColor bg-bgCard p-6 shadow-sm flex flex-col h-full text-textPrimary">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-textPrimary">National Highway Corridors</h2>
          <p className="text-xs font-semibold text-textSecondary">Real-time status summaries for key transit links in the NER</p>
        </div>
        <button 
          onClick={onRefresh}
          className="p-2 rounded-xl bg-bgPrimary border border-borderColor hover:bg-borderColor/40 transition text-textSecondary hover:text-textPrimary"
          title="Refresh Corridors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto flex-grow max-h-[360px] space-y-3.5 pr-1">
        {corridors.map((c) => (
          <div key={c.name} className="p-4 rounded-2xl bg-bgPrimary border border-borderColor hover:border-blue-500/40 transition shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-borderColor/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-textPrimary">{c.name}</span>
                <span className="text-xs text-textMuted font-bold">{c.length_km} km</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-textSecondary font-bold">Max Risk: {c.max_risk.toFixed(1)}</span>
                {getStatusBadge(c.status)}
              </div>
            </div>

            {/* List of sub-sections */}
            <div className="divide-y divide-borderColor/60">
              {c.sections.map((sec) => (
                <div key={sec.id} className="py-2.5 flex items-center justify-between text-sm gap-2">
                  <div className="flex-grow">
                    <div className="font-bold text-xs text-textPrimary">{sec.section}</div>
                    <div className="text-[11px] text-textSecondary font-semibold flex gap-2 mt-0.5">
                      <span>{sec.length_km} km</span>
                      <span>•</span>
                      <span>Risk: <strong className="text-textPrimary">{sec.risk_score.toFixed(1)}/10</strong></span>
                      <span>•</span>
                      <span>P: <strong className="text-textPrimary">{(sec.risk_probability * 100).toFixed(0)}%</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs">{getStatusBadge(sec.status)}</span>
                    {isAdmin && (
                      <button
                        disabled={updatingId === sec.id}
                        onClick={() => handleStatusOverride(sec.id, sec.status)}
                        className="p-1.5 rounded-lg bg-bgCard border border-borderColor hover:bg-bgPrimary text-textSecondary hover:text-textPrimary transition disabled:opacity-50 shadow-sm"
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
