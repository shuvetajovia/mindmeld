import React, { useState, useEffect } from "react";
import { Camera, RefreshCw, Smartphone, Database, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import { IncidentUploader } from "../components/IncidentUploader";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { mockApi } from "../services/mockApi";

interface FieldReportProps {
  apiBaseUrl: string;
}

interface ReportItem {
  id: number;
  reporter_name?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  photo_url?: string;
  description?: string;
  severity: string;
  category: string;
  crack_length: number;
  crack_depth: number;
  settlement_proximity: string;
  verified: boolean;
  created_at: string;
}

export const FieldReport: React.FC<FieldReportProps> = ({ apiBaseUrl }) => {
  const { isOnline, queuedCount, syncing, forceSync } = useOfflineSync(apiBaseUrl);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/reports/list`);
      if (response.ok) {
        setReports(await response.json());
      } else {
        throw new Error();
      }
    } catch (e) {
      // Offline fallback
      setReports(mockApi.getReports());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto text-textPrimary">
      
      {/* Offline cache sync warning banner */}
      <div className="glass-panel border border-borderColor rounded-2xl p-5 bg-bgCard flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 shrink-0 border border-blue-600/15 shadow-sm">
            <Smartphone className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-textPrimary uppercase">Citizen Observation Portal</h2>
            <p className="text-[10px] text-textSecondary font-semibold leading-snug">
              Submit active landslide cracks, rockfalls, or slumps on-site. Photo EXIF tags parse coordinates automatically.
            </p>
          </div>
        </div>
        
        {/* Offline cache indicators */}
        {queuedCount > 0 && (
          <div className="p-3 rounded-xl bg-alertOrange/10 border border-alertOrange/20 flex items-center justify-between gap-3 flex-grow sm:flex-grow-0 animate-pulse-slow">
            <div className="text-left font-semibold">
              <div className="text-[10px] font-black text-alertOrange uppercase">Local Cache Ready</div>
              <div className="text-[9px] text-textSecondary">{queuedCount} report(s) offline queue</div>
            </div>
            <button
              onClick={forceSync}
              disabled={syncing || !isOnline}
              className="px-3 py-1.5 rounded-lg bg-alertOrange hover:bg-orange-600 text-white text-[10px] font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-md"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} /> Sync Cache
            </button>
          </div>
        )}
      </div>

      {/* Incident reporting form & feeds split layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Incident Form Card */}
        <div className="md:col-span-1 flex flex-col">
          <IncidentUploader 
            apiBaseUrl={apiBaseUrl} 
            onReportSubmitted={fetchReports} 
          />
        </div>

        {/* History Feed Card */}
        <div className="md:col-span-1 flex flex-col h-full">
          <div className="glass-panel border border-borderColor rounded-2xl p-5 bg-bgCard h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-borderColor pb-2">
              <div>
                <h3 className="text-sm font-extrabold text-textPrimary flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" /> Incident History Log
                </h3>
                <p className="text-[10px] text-textSecondary font-bold">Your recent uploaded reports feed</p>
              </div>
              <button 
                onClick={fetchReports}
                className="p-1.5 rounded-lg bg-bgPrimary border border-borderColor hover:bg-borderColor/50 transition text-textSecondary hover:text-textPrimary"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* List entries */}
            <div className="overflow-y-auto flex-grow max-h-[380px] space-y-3 pr-1">
              {reports.length === 0 ? (
                <div className="py-12 text-center text-textMuted font-bold border border-dashed border-borderColor rounded-xl">
                  No active reports uploaded.
                </div>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="p-3.5 rounded-xl bg-bgPrimary border border-borderColor hover:border-borderColor/80 transition space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-bold text-textMuted">
                      <span className="font-mono">
                        GPS: {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase ${
                        r.verified 
                          ? "bg-alertGreen/15 text-alertGreen border-alertGreen/20" 
                          : "bg-alertYellow/15 text-alertYellow border-alertYellow/20 animate-pulse-slow"
                      }`}>
                        {r.verified ? "VERIFIED" : "PENDING"}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs font-black text-textPrimary">
                      <span>Category: {r.category || "Slope Slump"}</span>
                      {r.crack_length > 0 && (
                        <span className="font-mono text-[9px] text-textSecondary bg-bgCard border border-borderColor px-1.5 py-0.5 rounded">
                          {r.crack_length}m × {r.crack_depth}m
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-textSecondary leading-snug font-semibold">{r.description || "No description provided."}</p>
                    
                    <div className="pt-2 border-t border-borderColor/40 flex items-center justify-between text-[9px] text-textMuted font-bold">
                      <span>Severity: <strong className="text-textPrimary">{r.severity}</strong></span>
                      <span>Proximity: <strong className="text-textPrimary">{r.settlement_proximity}</strong></span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
