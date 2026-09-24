import React, { useState, useEffect } from "react";
import { Camera, RefreshCw, Smartphone, Database, ShieldAlert, Wifi, WifiOff, ShieldCheck, Lock, CheckCircle2, XCircle, Trash2, RotateCcw } from "lucide-react";
import { IncidentUploader } from "../components/IncidentUploader";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { mockApi } from "../services/mockApi";
import { supabase, isSupabaseConfigured } from "../services/supabaseClient";

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
  rejected?: boolean;
  created_at: string;
}

export const FieldReport: React.FC<FieldReportProps> = ({ apiBaseUrl }) => {
  const { isOnline, queuedCount, syncing, forceSync } = useOfflineSync(apiBaseUrl);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [officerProfile, setOfficerProfile] = useState<any>(null);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  // Check officer auth state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mindmeld_officer_user");
      if (saved) {
        setOfficerProfile(JSON.parse(saved));
      }
    } catch {
      setOfficerProfile(null);
    }
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (supabase && isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("field_crowdsource_reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          setReports(data as ReportItem[]);
          setLoading(false);
          return;
        }
      }

      const response = await fetch(`${apiBaseUrl}/api/v1/reports/list`);
      if (response.ok) {
        setReports(await response.json());
      } else {
        throw new Error();
      }
    } catch (e) {
      setReports(mockApi.getReports());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleToggleVerification = async (reportId: number, nextStatus: boolean) => {
    if (!officerProfile) {
      setVerifyNotice("⚠️ Action restricted: Only authenticated Disaster Management Officers can verify incident reports.");
      setTimeout(() => setVerifyNotice(null), 4000);
      return;
    }

    // Update local state
    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, verified: nextStatus, rejected: false } : r))
    );

    mockApi.verifyReport(reportId, nextStatus);

    // Sync to Supabase DB if available
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase
          .from("field_crowdsource_reports")
          .update({ verified: nextStatus, rejected: false })
          .eq("id", reportId);
      } catch (err) {
        console.warn("[FieldReport] Supabase report update failed:", err);
      }
    }

    setVerifyNotice(
      nextStatus
        ? `✅ Incident #${reportId} verified by Officer ${officerProfile.name}`
        : `Incident #${reportId} status returned to PENDING`
    );
    setTimeout(() => setVerifyNotice(null), 4000);
  };

  const handleRejectReport = async (reportId: number) => {
    if (!officerProfile) {
      setVerifyNotice("⚠️ Action restricted: Only authenticated Disaster Management Officers can reject incident reports.");
      setTimeout(() => setVerifyNotice(null), 4000);
      return;
    }

    // Update local state
    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, verified: false, rejected: true } : r))
    );

    mockApi.rejectReport(reportId);

    // Sync to Supabase DB if available
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase
          .from("field_crowdsource_reports")
          .update({ verified: false, rejected: true })
          .eq("id", reportId);
      } catch (err) {
        console.warn("[FieldReport] Supabase report rejection failed:", err);
      }
    }

    setVerifyNotice(`❌ Incident #${reportId} rejected by Officer ${officerProfile.name}`);
    setTimeout(() => setVerifyNotice(null), 4000);
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!officerProfile) {
      setVerifyNotice("⚠️ Action restricted: Only authenticated Disaster Management Officers can delete incident reports.");
      setTimeout(() => setVerifyNotice(null), 4000);
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete Incident #${reportId}?`)) {
      return;
    }

    // Update local state
    setReports(prev => prev.filter(r => r.id !== reportId));

    mockApi.deleteReport(reportId);

    // Sync to Supabase DB if available
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase
          .from("field_crowdsource_reports")
          .delete()
          .eq("id", reportId);
      } catch (err) {
        console.warn("[FieldReport] Supabase report deletion failed:", err);
      }
    }

    setVerifyNotice(`🗑️ Incident #${reportId} permanently deleted by Officer ${officerProfile.name}`);
    setTimeout(() => setVerifyNotice(null), 4000);
  };

  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto text-textPrimary">
      
      {/* Officer Clearance Status Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-bgCard border border-borderColor rounded-2xl text-xs font-semibold">
        <div className="flex items-center gap-2">
          {officerProfile ? (
            <>
              <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="text-textSecondary">
                Verification Authority: <strong className="text-emerald-500 font-bold">{officerProfile.name}</strong> ({officerProfile.badge || "Officer"})
              </span>
            </>
          ) : (
            <>
              <span className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
                <Lock className="w-4 h-4" />
              </span>
              <span className="text-textSecondary">
                Incident Verification: <strong className="text-amber-500">Officer Login Required</strong> to approve ground truth observations
              </span>
            </>
          )}
        </div>
        {officerProfile && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold">
            OFFICER CLEARANCE ACTIVE
          </span>
        )}
      </div>

      {verifyNotice && (
        <div className="p-3 bg-blue-600/10 border border-blue-500/25 rounded-xl text-xs font-bold text-blue-600 animate-fadeIn">
          {verifyNotice}
        </div>
      )}

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
                <p className="text-[10px] text-textSecondary font-bold">Field-verified slope observations & ground truth</p>
              </div>
              <button 
                onClick={fetchReports}
                className="p-1.5 rounded-lg bg-bgPrimary border border-borderColor hover:bg-borderColor/50 transition text-textSecondary hover:text-textPrimary"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* List entries */}
            <div className="overflow-y-auto flex-grow max-h-[420px] space-y-3 pr-1">
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
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase ${
                          r.rejected
                            ? "bg-red-500/15 text-red-500 border-red-500/25"
                            : r.verified 
                            ? "bg-alertGreen/15 text-alertGreen border-alertGreen/20" 
                            : "bg-alertYellow/15 text-alertYellow border-alertYellow/20 animate-pulse-slow"
                        }`}>
                          {r.rejected ? "REJECTED" : r.verified ? "VERIFIED" : "PENDING"}
                        </span>
                      </div>
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

                    {/* Officer Verification Action */}
                    <div className="pt-2 border-t border-borderColor/40 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {r.verified ? (
                          <span className="text-[10px] font-bold text-alertGreen flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified by Officer
                          </span>
                        ) : r.rejected ? (
                          <span className="text-[10px] font-bold text-alertRed flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Rejected by Officer
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-textMuted flex items-center gap-1">
                            Awaiting Officer Action
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {officerProfile ? (
                          <>
                            {!r.verified ? (
                              <button
                                onClick={() => handleToggleVerification(r.id, true)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase transition shadow-sm flex items-center gap-1 cursor-pointer"
                                title="Mark report as verified and valid"
                              >
                                <ShieldCheck className="w-3 h-3" /> Verify
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleVerification(r.id, false)}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/25 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Revoke verification to pending"
                              >
                                <RotateCcw className="w-3 h-3" /> Revoke
                              </button>
                            )}

                            {!r.rejected ? (
                              <button
                                onClick={() => handleRejectReport(r.id)}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Reject inaccurate or invalid field report"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleVerification(r.id, false)}
                                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Restore report to pending"
                              >
                                <RotateCcw className="w-3 h-3" /> Reopen
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteReport(r.id)}
                              className="px-2.5 py-1 bg-alertRed/10 hover:bg-alertRed text-alertRed hover:text-white border border-alertRed/30 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Permanently delete this incident report"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-[8px] text-textMuted font-semibold flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-textMuted" /> Officer verification required
                          </span>
                        )}
                      </div>
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

