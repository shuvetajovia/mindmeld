import React, { useState } from "react";
import { Compass, Info, ShieldAlert, Navigation } from "lucide-react";
import { RoutePlanner } from "../components/RoutePlanner";
import { GISMap } from "../components/GISMap";
import { useLiveTelemetry } from "../hooks/useLiveTelemetry";
import { SafeRouteResponse } from "../types/routing";
import { AlertsBanner } from "../components/AlertsBanner";

interface EmergencyRoutingProps {
  apiBaseUrl: string;
}

export const EmergencyRouting: React.FC<EmergencyRoutingProps> = ({ apiBaseUrl }) => {
  const { sensors, corridors, alerts } = useLiveTelemetry(apiBaseUrl, 15000);
  const [activeRoute, setActiveRoute] = useState<SafeRouteResponse | null>(null);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-textPrimary flex flex-col min-h-[calc(100vh-100px)]">
      {/* Alert ticker banner */}
      <AlertsBanner alerts={alerts} />

      {/* Main split routing panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow items-stretch">
        
        {/* Sidebar Controls - Left Column */}
        <div className="lg:col-span-1 flex flex-col h-full">
          <RoutePlanner 
            apiBaseUrl={apiBaseUrl} 
            onRouteComputed={(route) => setActiveRoute(route)} 
          />
        </div>

        {/* Large GIS Map - Right Column */}
        <div className="lg:col-span-2 flex flex-col h-full relative">
          <div className="glass-panel border border-borderColor rounded-2xl p-4 h-full flex flex-col bg-bgCard">
            <div className="flex items-center justify-between mb-3 border-b border-borderColor pb-2">
              <div>
                <h3 className="font-extrabold text-sm text-textPrimary flex items-center gap-1.5 uppercase">
                  <Navigation className="w-5 h-5 text-blue-600" /> Route Detour Mapper Tracks
                </h3>
                <p className="text-[10px] text-textSecondary">
                  Standard paths will automatically detour to solid emerald green lines if segment risks rise above Level 7.
                </p>
              </div>

              {activeRoute && activeRoute.alternative_available && (
                <span className="text-[9px] font-black text-alertOrange bg-alertOrange/10 border border-alertOrange/20 px-2.5 py-1 rounded-xl flex items-center gap-1 animate-pulse-slow">
                  <ShieldAlert className="w-3.5 h-3.5" /> DETOUR ACTIVE
                </span>
              )}
            </div>

            {/* GIS Map container */}
            <div className="flex-grow min-h-[480px] rounded-xl overflow-hidden relative border border-borderColor">
              <GISMap 
                corridors={corridors}
                sensors={sensors}
                activeRoute={activeRoute}
              />
            </div>
            
            <div className="mt-3 flex items-start gap-2 text-xs text-textSecondary p-3 bg-bgPrimary rounded-xl border border-borderColor shadow-sm font-semibold">
              <Info className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Operational Override Protocol:</strong> In emergency situations, dispatch administrators can override road statuses directly in the Command Center list to clear segments or block roads.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
