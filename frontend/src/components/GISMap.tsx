import React, { useState } from "react";
import { MapContainer, TileLayer, WMSTileLayer, Polyline, CircleMarker, Popup, Marker, Polygon } from "react-leaflet";
import L from "leaflet";
import { CorridorData, SensorNodeData } from "../hooks/useLiveTelemetry";
import { SafeRouteResponse } from "../types/routing";

// Overrides default Leaflet marker assets hash resolution in React SPA build contexts
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom Icons for Origin / Destination
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface GISMapProps {
  corridors: CorridorData[];
  sensors: SensorNodeData[];
  activeRoute: SafeRouteResponse | null;
  onSegmentSelect?: (segmentId: number) => void;
  onSensorSelect?: (sensorId: string) => void;
}

// NERDRR Multi-Hazard Susceptibility Polygon perimeters
interface HazardZoneMetadata {
  name: string;
  state: string;
  coords: [number, number][];
  severity: "EXTREME" | "HIGH";
  description: string;
}

const HAZARD_PERIMETERS: HazardZoneMetadata[] = [
  {
    name: "Sikkim Central Alpine Fault Zone",
    state: "Sikkim",
    coords: [[27.15, 88.30], [27.65, 88.35], [27.65, 88.70], [27.15, 88.70]],
    severity: "EXTREME",
    description: "Highly vulnerable slopes covering Mangan, Dzongu reserves, Namchi, and NH-10 Teesta corridors."
  },
  {
    name: "Nagaland Central Ridges Zone",
    state: "Nagaland",
    coords: [[25.70, 93.85], [25.85, 93.90], [25.80, 94.20], [25.60, 94.15]],
    severity: "EXTREME",
    description: "Steep tectonic fault zones flanking Kohima Town municipal ridgelines and Chumoukedima road bypass."
  },
  {
    name: "Mizoram Aizawl Municipal Slump Escarpment",
    state: "Mizoram",
    coords: [[23.65, 92.65], [23.80, 92.68], [23.80, 92.78], [23.65, 92.75]],
    severity: "EXTREME",
    description: "Steep sedimentary urban cuts vulnerable to monsoonal pore-water pressure spikes."
  },
  {
    name: "Assam Dima Hasao Railway Cut Corridor",
    state: "Assam",
    coords: [[25.10, 92.95], [25.25, 92.98], [25.22, 93.10], [25.08, 93.08]],
    severity: "HIGH",
    description: "Critical railway infrastructure linking Lumding to Badarpur. Active mudslumps and rockfall prone."
  },
  {
    name: "Arunachal Tawang Alpine Fault Block",
    state: "Arunachal",
    coords: [[27.20, 91.80], [27.65, 91.80], [27.65, 92.50], [27.20, 92.50]],
    severity: "EXTREME",
    description: "High altitude alpine slopes extending via Sela pass to Tawang valley settlements."
  },
  {
    name: "Meghalaya Southern Escarpment Block",
    state: "Meghalaya",
    coords: [[25.20, 91.50], [25.35, 91.50], [25.35, 91.80], [25.20, 91.80]],
    severity: "HIGH",
    description: "Extreme precipitation belt spanning Cherrapunji and Mawsynram terraced valleys."
  }
];

export const GISMap: React.FC<GISMapProps> = ({ 
  corridors, 
  sensors, 
  activeRoute,
  onSegmentSelect,
  onSensorSelect
}) => {
  const mapCenter: [number, number] = [26.2, 92.9]; // Center over Northeast India
  const defaultZoom = 7.5;
  const [mapMode, setMapMode] = useState<"geo-ai" | "radar-wms" | "hazard-zones" | "osm-terrain">("geo-ai");

  // Threat colors hierarchy
  const getAlertColor = (riskScore: number) => {
    if (riskScore >= 9.0) return "#EF4444"; // Level 9-10 (Critical / Red Alert)
    if (riskScore >= 7.0) return "#F97316"; // Level 7-8 (High / Orange Alert)
    if (riskScore >= 4.0) return "#F59E0B"; // Level 4-6 (Moderate / Yellow Advisory)
    return "#10B981"; // Level 1-3 (Low / Green Baseline)
  };

  const getAlertHaloClass = (riskScore: number) => {
    if (riskScore >= 9.0) return "halo-red";
    if (riskScore >= 7.0) return "halo-orange";
    if (riskScore >= 4.0) return "halo-yellow";
    return "halo-green";
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-borderColor shadow-2xl min-h-[520px] flex flex-col bg-bgCard">
      
      {/* Floating Pill Selector (Top Map Center Overlay) */}
      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-[1000] flex flex-wrap bg-bgCard/95 border border-borderColor rounded-xl p-1 shadow-lg backdrop-blur-md gap-0.5 max-w-[90%] sm:max-w-max justify-center">
        <button
          onClick={() => setMapMode("geo-ai")}
          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition tracking-wider flex items-center gap-1.5 ${
            mapMode === "geo-ai"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-textSecondary hover:text-textPrimary"
          }`}
        >
          🛰️ Geo-AI Grid
        </button>
        <button
          onClick={() => setMapMode("radar-wms")}
          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition tracking-wider flex items-center gap-1.5 ${
            mapMode === "radar-wms"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-textSecondary hover:text-textPrimary"
          }`}
        >
          🌧️ MOSDAC Radar
        </button>
        <button
          onClick={() => setMapMode("hazard-zones")}
          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition tracking-wider flex items-center gap-1.5 ${
            mapMode === "hazard-zones"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-textSecondary hover:text-textPrimary"
          }`}
        >
          ⚠️ NERDRR Hazard Zones
        </button>
        <button
          onClick={() => setMapMode("osm-terrain")}
          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition tracking-wider flex items-center gap-1.5 ${
            mapMode === "osm-terrain"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-textSecondary hover:text-textPrimary"
          }`}
        >
          🗺️ OSM Terrain
        </button>
      </div>

      {/* Map Container */}
      <div className="w-full h-full relative" style={{ minHeight: "520px" }}>
        <MapContainer 
          center={mapCenter} 
          zoom={defaultZoom} 
          scrollWheelZoom={true} 
          className="w-full h-full"
        >
          {/* Base tiles mapping */}
          {mapMode === "osm-terrain" ? (
            <TileLayer
              attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          )}

          {/* Renders weather rain radar clouds in MOSDAC Mode */}
          {mapMode === "radar-wms" && (
            <WMSTileLayer
              url="https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi"
              layers="nexrad-n0r-900913"
              format="image/png"
              transparent={true}
              opacity={0.55}
              attribution="Live Weather Radar Overlay"
            />
          )}

          {/* Renders NERDRR Multi-Hazard Zones polygons */}
          {mapMode === "hazard-zones" && (
            HAZARD_PERIMETERS.map((h, idx) => (
              <Polygon
                key={idx}
                positions={h.coords}
                pathOptions={{
                  color: h.severity === "EXTREME" ? "#EF4444" : "#F97316",
                  fillColor: h.severity === "EXTREME" ? "#EF4444" : "#F97316",
                  fillOpacity: 0.2,
                  weight: 2,
                  dashArray: "6, 6"
                }}
              >
                <Popup>
                  <div className="font-sans p-1 bg-bgCard text-textPrimary text-xs leading-normal">
                    <span className="font-black text-alertRed block uppercase text-[9px] mb-1">
                      ⚠️ NERDRR Hazard Vulnerability Perimeter
                    </span>
                    <strong className="block text-textPrimary text-xs">{h.name} ({h.state})</strong>
                    <p className="text-[10px] text-textSecondary mt-1 font-semibold">{h.description}</p>
                    <div className="mt-2 text-[9px] font-black uppercase text-alertOrange">
                      Vulnerability: {h.severity} Risk
                    </div>
                  </div>
                </Popup>
              </Polygon>
            ))
          )}

          {/* Render National Highway Corridors */}
          {corridors.map((c) =>
            c.sections.map((sec) => {
              if (!sec.coordinates || sec.coordinates.length === 0) return null;
              return (
                <Polyline
                  key={sec.id}
                  positions={sec.coordinates}
                  pathOptions={{
                    color: getAlertColor(sec.risk_score),
                    weight: 5,
                    opacity: 0.85,
                  }}
                  eventHandlers={{
                    click: () => {
                      if (onSegmentSelect) onSegmentSelect(sec.id);
                    },
                    mouseover: (e) => {
                      const layer = e.target;
                      layer.setStyle({ weight: 7, opacity: 1.0 });
                    },
                    mouseout: (e) => {
                      const layer = e.target;
                      layer.setStyle({ weight: 5, opacity: 0.85 });
                    }
                  }}
                >
                  <Popup>
                    <div className="p-1.5 font-sans text-textPrimary leading-snug bg-bgCard rounded-lg">
                      <div className="font-extrabold text-sm border-b border-borderColor pb-1 mb-1">
                        {c.name} - {sec.section}
                      </div>
                      <div className="text-xs space-y-1 mt-1.5 font-medium">
                        <p>
                          Status:{" "}
                          <span 
                            className="font-black uppercase"
                            style={{ color: getAlertColor(sec.risk_score) }}
                          >
                            {sec.status}
                          </span>
                        </p>
                        <p>Length: <strong>{sec.length_km} km</strong></p>
                        <p>Risk Score: <strong>{sec.risk_score.toFixed(1)}/10</strong></p>
                        <p>Failure Prob: <strong>{(sec.risk_probability * 100).toFixed(0)}%</strong></p>
                      </div>
                      <button 
                        onClick={() => onSegmentSelect && onSegmentSelect(sec.id)}
                        className="mt-3 w-full py-1.5 text-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition"
                      >
                        Show Detailed AI Forecast & SHAP
                      </button>
                    </div>
                  </Popup>
                </Polyline>
              );
            })
          )}

          {/* Draw Alternate Detour Safe Routing paths */}
          {activeRoute && activeRoute.waypoints && activeRoute.waypoints.length > 0 && (
            <>
              {activeRoute.alternative_available && activeRoute.blocked_waypoints && (
                <Polyline
                  positions={activeRoute.blocked_waypoints}
                  pathOptions={{
                    color: "#EF4444",
                    weight: 5,
                    dashArray: "8, 8",
                    opacity: 0.85,
                  }}
                />
              )}

              <Polyline
                positions={activeRoute.waypoints}
                pathOptions={{
                  color: "#10B981",
                  weight: 6,
                  opacity: 0.95,
                }}
              />

              <Marker position={activeRoute.waypoints[0]} icon={greenIcon}>
                <Popup>
                  <div className="font-bold text-xs text-textPrimary text-center bg-bgCard p-1 rounded">
                    ORIGIN JUNCTION<br />
                    <span className="font-black text-sm text-alertGreen">{activeRoute.origin}</span>
                  </div>
                </Popup>
              </Marker>

              <Marker position={activeRoute.waypoints[activeRoute.waypoints.length - 1]} icon={redIcon}>
                <Popup>
                  <div className="font-bold text-xs text-textPrimary text-center bg-bgCard p-1 rounded">
                    DESTINATION TARGET<br />
                    <span className="font-black text-sm text-alertRed">{activeRoute.destination}</span>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Render 40 dynamic stations with pulsing halos */}
          {sensors.map((s) => {
            const SM = s.soil_moisture;
            const rain = s.rain_24h_obs;
            const computedRisk = SM > 50 || rain > 150 ? 9.2 : SM > 40 || rain > 90 ? 7.5 : SM > 30 || rain > 40 ? 5.2 : 2.0;

            const color = getAlertColor(computedRisk);
            const haloClass = getAlertHaloClass(computedRisk);

            return (
              <React.Fragment key={s.id}>
                {/* Dynamic Pulsing Halo Layer */}
                <CircleMarker
                  center={[s.latitude, s.longitude]}
                  radius={15}
                  className={haloClass}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.16,
                    stroke: false
                  }}
                />

                {/* Core Circle Marker */}
                <CircleMarker
                  center={[s.latitude, s.longitude]}
                  radius={7}
                  pathOptions={{
                    color: "#FFFFFF",
                    fillColor: color,
                    fillOpacity: 0.95,
                    weight: 1.5
                  }}
                  eventHandlers={{
                    click: () => {
                      if (onSensorSelect) onSensorSelect(s.id);
                    }
                  }}
                >
                  <Popup>
                    <div className="p-1.5 font-sans bg-bgCard text-textPrimary leading-snug rounded-lg">
                      <div className="font-black text-xs border-b border-borderColor pb-1 mb-1 text-blue-700">
                        {s.name}
                      </div>
                      <div className="text-[10px] space-y-0.5 mt-1 font-bold text-textSecondary">
                        <p>ID: <strong className="font-mono text-textPrimary">{s.id}</strong></p>
                        <p>Soil Moisture VWC: <strong className="text-blue-600">{s.soil_moisture.toFixed(1)}%</strong></p>
                        <p>24h Rain Accumulation: <strong className="text-indigo-600">{s.rain_24h_obs.toFixed(1)} mm</strong></p>
                        <p>API 7d Index: <strong>{s.api_7d.toFixed(1)} mm</strong></p>
                        <p>Seasonal Anomaly: <strong>{s.r24_seasonal_anom.toFixed(1)} mm</strong></p>
                        <p className="border-t border-borderColor/60 mt-1 pt-1">
                          Alert: <strong style={{ color: color }}>{computedRisk >= 9 ? "CRITICAL RED" : computedRisk >= 7 ? "HIGH ORANGE" : computedRisk >= 4 ? "MODERATE YELLOW" : "LOW GREEN"}</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => onSensorSelect && onSensorSelect(s.id)}
                        className="mt-2.5 w-full py-1 text-center bg-blue-600 hover:bg-blue-700 text-white rounded text-[9px] font-bold transition"
                      >
                        Inspect Node Analytics
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
