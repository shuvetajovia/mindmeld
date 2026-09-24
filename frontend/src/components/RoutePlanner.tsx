import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navigation, MapPin, Compass, ShieldAlert, ShieldCheck, Route, Zap } from "lucide-react";
import { SafeRouteResponse } from "../types/routing";
import { CorridorData } from "../hooks/useLiveTelemetry";
import { computeOSRMSafeRoute, NER_CITIES } from "../services/osrmRoutingService";

interface RoutePlannerProps {
  apiBaseUrl: string;
  corridors?: CorridorData[];
  onRouteComputed: (route: SafeRouteResponse) => void;
  initialOrigin?: string;
  initialDestination?: string;
  autoCalculate?: boolean;
}

const CITIES = Object.keys(NER_CITIES);

export const RoutePlanner: React.FC<RoutePlannerProps> = ({ 
  apiBaseUrl, 
  corridors = [], 
  onRouteComputed,
  initialOrigin,
  initialDestination,
  autoCalculate
}) => {
  const [origin, setOrigin] = useState<string>(initialOrigin || "Guwahati");
  const [destination, setDestination] = useState<string>(initialDestination || "Kohima");
  const [alpha, setAlpha] = useState<number>(1.2); // Default sensitivity
  const [loading, setLoading] = useState<boolean>(false);
  const [routeResult, setRouteResult] = useState<SafeRouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep references to prevent re-creation loops
  const onRouteComputedRef = useRef(onRouteComputed);
  onRouteComputedRef.current = onRouteComputed;

  const corridorsRef = useRef(corridors);
  corridorsRef.current = corridors;

  const lastCalculatedKeyRef = useRef<string>("");

  const executeRouteCalculation = useCallback(async (origCity: string, destCity: string, sensitivity: number) => {
    if (origCity === destCity) {
      setError("Origin and Destination cannot be the same junction point.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Calculate authentic OpenStreetMap road highway geometry via OSRM
      const osrmResult = await computeOSRMSafeRoute(origCity, destCity, sensitivity, corridorsRef.current);
      setRouteResult(osrmResult);
      if (onRouteComputedRef.current) {
        onRouteComputedRef.current(osrmResult);
      }
    } catch (err: any) {
      console.warn("[RoutePlanner] OSRM routing failed, falling back to local solver:", err);
      try {
        const fallback = await computeOSRMSafeRoute(origCity, destCity, sensitivity, corridorsRef.current);
        setRouteResult(fallback);
        if (onRouteComputedRef.current) {
          onRouteComputedRef.current(fallback);
        }
      } catch (finalErr: any) {
        setError(finalErr?.message || "Route calculation error");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle incoming route params from Command Center alert cards
  useEffect(() => {
    if (initialOrigin && initialDestination) {
      setOrigin(initialOrigin);
      setDestination(initialDestination);
      const reqKey = `${initialOrigin}-->${initialDestination}--${alpha}`;
      if (autoCalculate && lastCalculatedKeyRef.current !== reqKey) {
        lastCalculatedKeyRef.current = reqKey;
        executeRouteCalculation(initialOrigin, initialDestination, alpha);
      }
    }
  }, [initialOrigin, initialDestination, autoCalculate, alpha, executeRouteCalculation]);

  const handleComputeRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    lastCalculatedKeyRef.current = `${origin}-->${destination}--${alpha}`;
    await executeRouteCalculation(origin, destination, alpha);
  };

  return (
    <div className="rounded-2xl border border-borderColor bg-bgCard p-5 shadow-sm flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-base font-extrabold tracking-tight text-textPrimary flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-600" /> Regional Safe Route Planner
        </h2>
        <p className="text-[10px] text-textSecondary leading-snug">
          Real-time OpenStreetMap highway routing with automatic hazard detour detection
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            🗺️ OpenStreetMap (OSRM) Active
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            🛡️ Dynamic Hazard Detours
          </span>
        </div>
      </div>

      <form onSubmit={handleComputeRoute} className="space-y-4">
        {/* Origin */}
        <div>
          <label className="text-[9px] font-bold text-textMuted uppercase tracking-wider block mb-1">Origin Junction</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-alertGreen" />
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-bgPrimary border border-borderColor text-textPrimary focus:outline-none focus:border-blue-600 text-xs appearance-none font-semibold"
            >
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Destination */}
        <div>
          <label className="text-[9px] font-bold text-textMuted uppercase tracking-wider block mb-1">Destination Target</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-alertRed" />
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-bgPrimary border border-borderColor text-textPrimary focus:outline-none focus:border-blue-600 text-xs appearance-none font-semibold"
            >
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Hazard Sensitivity Alpha Slider */}
        <div>
          <div className="flex justify-between text-[9px] font-bold text-textMuted uppercase tracking-wider mb-1">
            <span>Risk Sensitivity (&alpha;)</span>
            <span className="text-blue-600 font-mono font-bold">{alpha.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="3.0"
            step="0.1"
            value={alpha}
            onChange={(e) => setAlpha(parseFloat(e.target.value))}
            className="w-full accent-blue-600 bg-borderColor rounded-lg h-1"
          />
          <div className="flex justify-between text-[9px] text-textMuted mt-1 font-medium">
            <span>Ignore Risk (Shortest)</span>
            <span>Balanced</span>
            <span>Avoid Hazards</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center justify-center gap-2 text-xs shadow-md shadow-blue-500/10 disabled:opacity-50"
        >
          {loading ? "Calculating Safest Track..." : "Compute Safe Detours"}
        </button>
      </form>

      {error && (
        <div className="p-3 rounded-xl bg-alertRed/10 border border-alertRed/25 text-alertRed text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Routing Results Summary */}
      {routeResult && !loading && (
        <div className="flex-grow overflow-y-auto space-y-4 max-h-[300px] pr-1 pt-2 border-t border-borderColor/60">
          
          <div className="p-3 rounded-xl bg-bgPrimary border border-borderColor space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-textMuted font-bold uppercase">Transit Status</span>
              {routeResult.alternative_available ? (
                <span className="flex items-center gap-1 text-[10px] font-black text-alertOrange bg-alertOrange/10 border border-alertOrange/20 px-2 py-0.5 rounded animate-pulse-slow">
                  <ShieldAlert className="w-3.5 h-3.5" /> DETOUR ACTIVE
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-black text-alertGreen bg-alertGreen/10 border border-alertGreen/20 px-2 py-0.5 rounded">
                  <ShieldCheck className="w-3.5 h-3.5" /> CLEAR TRACK
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-bgCard p-2 rounded-lg border border-borderColor shadow-sm">
                <div className="text-[9px] text-textSecondary font-bold uppercase">Distance</div>
                <div className="text-base font-black text-textPrimary">{routeResult.total_distance_km} km</div>
              </div>
              <div className="bg-bgCard p-2 rounded-lg border border-borderColor shadow-sm">
                <div className="text-[9px] text-textSecondary font-bold uppercase">Avg Risk score</div>
                <div className="text-base font-black text-textPrimary">{routeResult.average_risk.toFixed(1)}/10</div>
              </div>
            </div>
          </div>

          {/* 3. Detour comparison card rendered on condition */}
          {routeResult.alternative_available && routeResult.detour_difference && (
            <div className="p-4 rounded-xl bg-alertOrange/5 border border-alertOrange/20 space-y-3 text-xs">
              <h4 className="font-black text-alertOrange uppercase tracking-wider text-[10px] flex items-center gap-1.5 border-b border-alertOrange/10 pb-1.5">
                <ShieldAlert className="w-4 h-4" /> Detour Comparison Analysis
              </h4>
              <div className="grid grid-cols-2 gap-2 text-center text-textPrimary">
                <div className="bg-bgCard p-2 rounded-lg border border-borderColor shadow-sm">
                  <span className="text-[9px] font-bold text-textSecondary block">Added Distance</span>
                  <span className="font-extrabold text-xs">+{routeResult.detour_difference.extra_km} km</span>
                </div>
                <div className="bg-bgCard p-2 rounded-lg border border-borderColor shadow-sm">
                  <span className="text-[9px] font-bold text-textSecondary block">Added Delay</span>
                  <span className="font-extrabold text-xs">+{routeResult.detour_difference.extra_mins} mins</span>
                </div>
              </div>

              <div className="bg-bgCard p-2 rounded-lg border border-borderColor flex justify-between items-center shadow-sm">
                <span className="text-[10px] font-bold text-textSecondary">Safety Gradient score</span>
                <span className="text-xs font-black text-alertGreen bg-alertGreen/10 px-2 py-0.5 rounded border border-alertGreen/20">
                  {routeResult.detour_difference.safety_score.toFixed(1)}/10
                </span>
              </div>

              <div className="bg-bgCard p-2.5 rounded-lg border border-borderColor space-y-1.5 shadow-sm text-[10px]">
                <div className="font-bold text-textMuted uppercase">Emergency Helpline Desk</div>
                <div className="text-textSecondary font-semibold leading-relaxed">
                  {routeResult.detour_difference.helpline}
                </div>
              </div>
            </div>
          )}

          {/* Route step details */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-textMuted uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-blue-600" /> Directional Steps
            </h4>
            <div className="space-y-2">
              {routeResult.detour_steps.map((step, idx) => (
                <div key={idx} className="flex gap-3 text-xs leading-relaxed border-l-2 border-borderColor pl-3 py-1.5 hover:border-blue-600 transition">
                  <div className="flex-grow">
                    <p className="text-textPrimary font-bold">{step.instruction}</p>
                    <p className="text-[10px] text-textSecondary mt-0.5">
                      {step.segment_name} ({step.distance_km} km • Est: {step.estimated_time_mins} mins)
                    </p>
                  </div>
                  <span 
                    className="text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 self-start border bg-bgCard"
                    style={{ 
                      color: step.risk_score >= 7.0 ? "#EF4444" : step.risk_score >= 4.0 ? "#F59E0B" : "#10B981",
                      borderColor: step.risk_score >= 7.0 ? "rgba(239,68,68,0.2)" : step.risk_score >= 4.0 ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"
                    }}
                  >
                    {step.risk_score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
