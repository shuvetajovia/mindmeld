import React from "react";
import { AlertTriangle, ShieldCheck, Volume2, Info } from "lucide-react";
import { CAPAlertData } from "../hooks/useLiveTelemetry";

interface AlertsBannerProps {
  alerts: CAPAlertData[];
}

export const AlertsBanner: React.FC<AlertsBannerProps> = ({ alerts }) => {
  // Static state clearances and hazard updates for the scrolling marquee ticker
  const tickerMessages = [
    "📢 MIZORAM: Aizawl Municipal Slopes clearance operations completed; all local bypass tracks reporting OPEN.",
    "⚠️ SIKKIM: NH-10 Kalimpong cut slope under CAUTION advisory due to 125mm antecedent rainfall. Drive slowly.",
    "🚨 NAGALAND: NH-29 Chumoukedima section BLOCKED by debris flow. Dynamic detours active via Mokokchung bypass.",
    "⚠️ ASSAM: Dima Hasao railway cutting under critical monitoring. Inclinometer angular drift detected.",
    "📢 MEGHALAYA: Shillong Urban Cuts clear. Weather station reports nominal rain accumulation.",
    "⚠️ ARUNACHAL: Tawang valley settlements caution advised; minor rockfall clearance in progress on NH-229.",
    "📢 TRIPURA: Dharmanagar border link reporting stable soil moisture levels. Status: OPERATIONAL.",
    "⚠️ MANIPUR: Ukhrul rural hamlets feeder road reporting minor subsidence. Heavy transport vehicles restricted."
  ];

  return (
    <div className="space-y-4 w-full">
      {/* 1. Brand Live Scrolling Ticker */}
      <div className="w-full bg-bgCard border border-borderColor rounded-xl overflow-hidden py-2 px-4 flex items-center gap-3 shadow-sm">
        <span className="flex items-center gap-1 text-[10px] font-black text-white bg-alertRed px-2.5 py-0.5 rounded shrink-0 animate-pulse-slow">
          LIVE STATUS
        </span>
        <div className="ticker-wrap flex-grow relative overflow-hidden">
          <div className="ticker-content whitespace-nowrap inline-block animate-marquee select-none text-xs font-semibold text-textSecondary">
            {/* Repeat list twice to ensure seamless continuous scroll */}
            {tickerMessages.concat(tickerMessages).map((msg, i) => (
              <span key={i} className="inline-block mx-6 text-textSecondary dark:text-gray-300">
                {msg}
              </span>
            ))}
          </div>
        </div>
        <Volume2 className="w-4 h-4 text-textMuted shrink-0 hidden sm:block" />
      </div>

      {/* 2. OASIS CAP Broadcast Alerts Display */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => {
            const info = alert.info[0];
            const severity = info.severity; // Extreme, Severe, Moderate, Minor
            const isExtreme = severity === "Extreme" || severity === "Severe";
            
            // Map alert level to design colors
            const borderCol = isExtreme ? "border-alertRed/30" : "border-alertOrange/30";
            const bgCol = isExtreme ? "bg-alertRed/5" : "bg-alertOrange/5";
            const textCol = isExtreme ? "text-alertRed" : "text-alertOrange";
            const glowClass = isExtreme ? "halo-red" : "halo-orange";

            return (
              <div 
                key={alert.identifier || idx}
                className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl border ${borderCol} ${bgCol} text-sm font-semibold shadow-sm gap-4 transition-all duration-300`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl bg-bgCard border border-borderColor text-textPrimary shrink-0 shadow-sm ${glowClass}`}>
                    <AlertTriangle className={`w-5 h-5 ${textCol}`} />
                  </div>
                  <div className="leading-relaxed">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${textCol} bg-bgCard border border-borderColor`}>
                        {severity} WARNING
                      </span>
                      <span className="text-textPrimary font-extrabold text-sm">{info.headline}</span>
                    </div>
                    <p className="text-xs text-textSecondary font-medium mt-1 leading-snug">{info.description}</p>
                    {info.instruction && (
                      <div className="text-xs text-textPrimary/80 mt-2 bg-bgCard/40 p-2 rounded-lg border border-borderColor/30 flex items-start gap-1.5 font-medium">
                        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span><strong>Instruction:</strong> {info.instruction}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto font-normal text-[10px] text-textMuted bg-bgCard border border-borderColor px-3 py-1.5 rounded-xl shrink-0 shadow-sm">
                  <span>Broadcast: <strong>{alert.sender}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
