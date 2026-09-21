import React, { useState } from "react";
import {
  BarChart3, FlaskConical, Satellite, Cpu, Radio, Map, TrendingUp,
  CheckCircle2, Clock, ArrowRight, Database, Layers, Zap, GitBranch, Info, Award
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Cell
} from "recharts";

// Model performance metrics (from paper/specification)
const MODEL_METRICS = [
  { metric: "Spatial Block CV ROC-AUC", value: 0.889, max: 1.0, label: "0.889", color: "#10B981" },
  { metric: "PR-AUC (Precision-Recall)", value: 0.855, max: 1.0, label: "0.855", color: "#10B981" },
  { metric: "Brier Score (↓ better)", value: 0.120, max: 0.25, label: "0.120", inverse: true, color: "#10B981" },
  { metric: "Critical Success Index (CSI)", value: 0.764, max: 1.0, label: "0.764", color: "#F59E0B" },
  { metric: "Recall (Sensitivity)", value: 0.831, max: 1.0, label: "0.831", color: "#10B981" },
  { metric: "Precision", value: 0.798, max: 1.0, label: "0.798", color: "#F59E0B" },
  { metric: "F1 Score", value: 0.814, max: 1.0, label: "0.814", color: "#10B981" },
];

const RADAR_DATA = [
  { metric: "ROC-AUC", value: 88.9 },
  { metric: "PR-AUC", value: 85.5 },
  { metric: "CSI", value: 76.4 },
  { metric: "Recall", value: 83.1 },
  { metric: "Precision", value: 79.8 },
  { metric: "F1", value: 81.4 },
];

// SHAP feature importance data
const SHAP_FEATURES = [
  { name: "24h Rain (r24)", shap: 0.312, tier: "Hydro" },
  { name: "API 7d", shap: 0.278, tier: "Hydro" },
  { name: "Pore Pressure", shap: 0.241, tier: "Geotech" },
  { name: "Soil VWC", shap: 0.198, tier: "Geotech" },
  { name: "Slope Angle", shap: 0.185, tier: "Static" },
  { name: "Inclinometer Drift", shap: 0.162, tier: "Geotech" },
  { name: "Elevation", shap: 0.144, tier: "Static" },
  { name: "Curvature", shap: 0.128, tier: "Static" },
  { name: "Rain Anomaly Z", shap: 0.115, tier: "Hydro" },
  { name: "Dist. Infrastructure", shap: 0.098, tier: "Static" },
];

const SHAP_COLORS: Record<string, string> = {
  Hydro: "#2563EB",
  Static: "#8B5CF6",
  Geotech: "#F59E0B",
};

const ROADMAP_ITEMS = [
  {
    phase: "Phase 1",
    label: "Live",
    color: "bg-alertGreen text-white",
    icon: CheckCircle2,
    iconColor: "text-alertGreen",
    title: "Core EWS Platform",
    items: [
      "40-node IoT monitoring grid across all 8 NER states",
      "Two-tier ML susceptibility + trigger fusion model",
      "Native Leaflet GIS with NERDRR hazard polygons",
      "Citizen crowdsourced incident submission portal",
      "Offline resilience with Supabase + local mock fallback",
    ]
  },
  {
    phase: "Phase 2",
    label: "In Progress",
    color: "bg-alertYellow text-white",
    icon: Clock,
    iconColor: "text-alertYellow",
    title: "InSAR Surface Deformation Monitoring",
    items: [
      "Sentinel-1A DInSAR differential interferometry integration",
      "NISAR satellite displacement grid ingestion (post-2025 launch)",
      "Millimeter-level slope creep velocity maps over NE India",
      "Pre-failure deformation time-series anomaly alerts",
      "Integration with GSI landslide susceptibility atlas (1:50,000)",
    ]
  },
  {
    phase: "Phase 3",
    label: "Planned",
    color: "bg-blue-600 text-white",
    icon: Zap,
    iconColor: "text-blue-500",
    title: "Edge AI Micro-Node Deployment",
    items: [
      "TinyML inference on LoRaWAN-enabled ESP32 sensor nodes",
      "Offline local siren trigger in remote valleys without connectivity",
      "Federated model learning across distributed nodes",
      "Solar-powered enclosures with 6-month autonomous operation",
      "Satellite uplink via ISRO NavIC for last-mile telemetry",
    ]
  },
  {
    phase: "Phase 4",
    label: "Research",
    color: "bg-purple-600 text-white",
    icon: FlaskConical,
    iconColor: "text-purple-500",
    title: "Crowdsourced Computer Vision",
    items: [
      "On-device mobile image segmentation for crack width estimation",
      "Automated rockfall volume estimation from smartphone photos",
      "Foundation model fine-tuning on GSI historical landslide imagery",
      "Real-time debris flow runout distance prediction via CNN",
      "Multi-temporal satellite change detection (PlanetScope / CNES SPOT)",
    ]
  },
];

const tooltipStyle = {
  backgroundColor: "var(--bg-card)",
  borderColor: "var(--border-color)",
  borderRadius: "0.5rem",
  fontSize: "10px",
  fontWeight: 600,
  color: "var(--text-primary)",
};

export const DataAnalysisPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<"architecture" | "features" | "roadmap">("architecture");

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-textPrimary">

      {/* Page Header */}
      <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-600 border border-blue-600/15 shadow-sm shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-textPrimary uppercase tracking-tight">
                Data Analysis, Training Pipeline & Future Roadmap
              </h2>
              <p className="text-[10px] text-textSecondary mt-0.5">
                MindMeld Architecture • AI-Based Early Warning & Landslide Risk Monitoring System
              </p>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center bg-bgPrimary border border-borderColor rounded-xl p-1 gap-0.5">
            {(["architecture", "features", "roadmap"] as const).map(s => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition ${
                  activeSection === s ? "bg-blue-600 text-white shadow-sm" : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                {s === "architecture" ? "📐 Architecture" : s === "features" ? "🧬 Features" : "🚀 Roadmap"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────── */}
      {/* SECTION 1: TRAINING ARCHITECTURE & EVALUATION AUDIT    */}
      {/* ─────────────────────────────────────────────────────── */}
      {activeSection === "architecture" && (
        <div className="space-y-6">
          {/* Training Method Card */}
          <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm">
            <div className="flex items-center gap-2 mb-5 border-b border-borderColor pb-3">
              <GitBranch className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-extrabold text-xs text-textPrimary uppercase">Two-Tier Training Methodology</h3>
                <p className="text-[9px] text-textSecondary">GSI Landslide Catalog ingestion → LORO/LOYO spatial-temporal cross-validation</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Data ingestion card */}
              <div className="p-4 bg-bgPrimary border border-borderColor rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="text-[10px] font-black text-textPrimary uppercase">Data Catalog</span>
                </div>
                <div className="space-y-2 text-xs font-semibold text-textSecondary">
                  <div className="flex justify-between border-b border-borderColor pb-1.5">
                    <span>GSI Catalog Records</span>
                    <span className="font-black text-textPrimary font-mono">30,842</span>
                  </div>
                  <div className="flex justify-between border-b border-borderColor pb-1.5">
                    <span>NER States Covered</span>
                    <span className="font-black text-textPrimary">All 8</span>
                  </div>
                  <div className="flex justify-between border-b border-borderColor pb-1.5">
                    <span>Temporal Span</span>
                    <span className="font-black text-textPrimary">1998–2024</span>
                  </div>
                  <div className="flex justify-between border-b border-borderColor pb-1.5">
                    <span>Spatial Resolution</span>
                    <span className="font-black text-textPrimary">30m SRTM DEM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Positive Events</span>
                    <span className="font-black text-textPrimary">6,214 slides</span>
                  </div>
                </div>
              </div>

              {/* Validation schema */}
              <div className="p-4 bg-bgPrimary border border-borderColor rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-purple-500" />
                  <span className="text-[10px] font-black text-textPrimary uppercase">Cross-Validation Schema</span>
                </div>
                <div className="space-y-2 text-xs font-semibold text-textSecondary">
                  <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/15">
                    <div className="text-[9px] font-black text-purple-600 uppercase mb-1">LORO — Leave-One-Region-Out</div>
                    <p className="text-[9px] leading-snug">Trains on 7 states, validates on the held-out 8th state. Tests spatial generalization across climate zones and lithologies.</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15">
                    <div className="text-[9px] font-black text-blue-600 uppercase mb-1">LOYO — Leave-One-Year-Out</div>
                    <p className="text-[9px] leading-snug">Trains on all years except one monsoon season. Validates temporal robustness against seasonal rainfall anomaly drift.</p>
                  </div>
                </div>
              </div>

              {/* Fusion equation */}
              <div className="p-4 bg-bgPrimary border border-borderColor rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-black text-textPrimary uppercase">Meta-Calibrator Fusion</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-bgCard border border-borderColor font-mono text-[9px] text-textSecondary leading-relaxed">
                    <div className="text-[8px] font-black uppercase text-textMuted mb-1">Tier 1: Static Susceptibility</div>
                    <div>logit(S) = 0.045·<em>slope</em> + 0.0003·<em>elev</em> + 1.2·<em>curv</em> − 1.8·<em>dist</em> + 0.15·<em>aspect</em> − 1.25</div>
                  </div>
                  <div className="p-3 rounded-lg bg-bgCard border border-borderColor font-mono text-[9px] text-textSecondary leading-relaxed">
                    <div className="text-[8px] font-black uppercase text-textMuted mb-1">Tier 2: Hydro-Geotech Trigger</div>
                    <div>logit(T) = 0.018·<em>r24</em> + 0.005·<em>api</em> + 0.022·<em>pore</em> + 20·<em>incl</em> − 1.95</div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 font-mono text-[9px] text-textSecondary leading-relaxed">
                    <div className="text-[8px] font-black uppercase text-blue-600 mb-1">Fused Probability</div>
                    <div className="text-blue-600 font-black">P = σ(0.169·logit(S) + 0.936·logit(T) − 0.778)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metric Cards */}
            <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-borderColor pb-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="font-extrabold text-xs text-textPrimary uppercase">Model Performance Matrix</h3>
              </div>
              <div className="space-y-3">
                {MODEL_METRICS.map(m => {
                  const pct = m.inverse
                    ? (1 - m.value / m.max) * 100
                    : (m.value / m.max) * 100;
                  const barColor = m.value > 0.85 ? "#10B981" : m.value > 0.75 ? "#F59E0B" : "#EF4444";
                  return (
                    <div key={m.metric}>
                      <div className="flex justify-between text-[9px] font-bold text-textSecondary mb-0.5">
                        <span>{m.metric}</span>
                        <span className="font-black font-mono" style={{ color: barColor }}>{m.label}</span>
                      </div>
                      <div className="w-full h-2 bg-bgPrimary rounded-full overflow-hidden border border-borderColor">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Radar chart */}
            <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-2 border-b border-borderColor pb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-xs text-textPrimary uppercase">Performance Radar</h3>
              </div>
              <div className="flex-grow h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={RADAR_DATA}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 700 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: "var(--text-muted)" }} />
                    <Radar
                      name="Model Score"
                      dataKey="value"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* SHAP bar below */}
              <div className="h-36 mt-2">
                <div className="text-[8px] font-black text-textMuted uppercase mb-1">SHAP Mean |Feature| Importance</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={SHAP_FEATURES} layout="vertical" margin={{ left: 4, right: 16, top: 2, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.2} horizontal={false} />
                    <XAxis type="number" domain={[0, 0.35]} tick={{ fontSize: 7, fill: "var(--text-muted)" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 7, fill: "var(--text-muted)" }} width={80} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${Number(v).toFixed(3)}`, "SHAP"]} />
                    <Bar dataKey="shap" radius={[0, 3, 3, 0]}>
                      {SHAP_FEATURES.map((entry, idx) => (
                        <Cell key={idx} fill={SHAP_COLORS[entry.tier]} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────── */}
      {/* SECTION 2: DATA FEATURES PANEL                         */}
      {/* ─────────────────────────────────────────────────────── */}
      {activeSection === "features" && (
        <div className="space-y-5">
          {[
            {
              icon: Map,
              iconColor: "text-purple-500",
              category: "Static Geomorphology",
              source: "30m SRTM DEM + OpenStreetMap",
              features: [
                { name: "Slope Angle", desc: "Derived from DEM gradient. Key susceptibility driver for shallow translational slides.", unit: "°", range: "0–90°" },
                { name: "Elevation MSL", desc: "Terrain height above mean sea level from SRTM DEM 30m resolution.", unit: "m", range: "50–4200 m" },
                { name: "Aspect (Sin/Cos)", desc: "Solar exposure orientation affects desiccation, vegetation density, and pore pressure cycles.", unit: "rad", range: "−1 to 1" },
                { name: "Slope Curvature", desc: "Profile curvature; convex vs concave controls flow convergence and groundwater accumulation.", unit: "m⁻¹", range: "−0.15 to 0.25" },
                { name: "Dist. to Road Cut", desc: "Proximity to infrastructure cutting (OSM road network). Steep cuts drastically raise susceptibility.", unit: "km", range: "0.001–5.0 km" },
                { name: "Lithology Zone", desc: "Rock type vulnerability class from CGPB geological maps. Schist/phyllite = highest risk.", unit: "class", range: "1–6" },
              ]
            },
            {
              icon: Radio,
              iconColor: "text-blue-500",
              category: "Dynamic Hydrology",
              source: "IMD Gridded Daily Rainfall + MOSDAC GSMap",
              features: [
                { name: "24h Rain Accumulation", desc: "Primary short-duration trigger. IMD definition: Heavy ≥ 64.5 mm, Extremely Heavy ≥ 204.4 mm.", unit: "mm", range: "0–350 mm" },
                { name: "48h Prior Rainfall", desc: "Intermediate antecedent condition indicator. Identifies pre-saturated soil conditions.", unit: "mm", range: "0–500 mm" },
                { name: "72h Prior Rainfall", desc: "Extended window for deeper regolith saturation estimation.", unit: "mm", range: "0–600 mm" },
                { name: "7-day Accumulation", desc: "Long-term soil moisture preconditioning. Used in API computation.", unit: "mm", range: "0–900 mm" },
                { name: "API 7d (k=0.84)", desc: "Antecedent Precipitation Index with exponential decay: API = Σ(k^i × r_i). Captures subsurface saturation state.", unit: "mm", range: "0–350 mm" },
                { name: "Seasonal Z-Score Anomaly", desc: "Standardized departure from 30-year monsoon climatology mean for the Julian week.", unit: "σ", range: "−3 to +4σ" },
              ]
            },
            {
              icon: Zap,
              iconColor: "text-amber-500",
              category: "In-Situ Geotechnical Telemetry",
              source: "IoT Field Sensor Array — 40 NER Monitoring Stations",
              features: [
                { name: "Piezometer Pore Pressure", desc: "Measures pore-water pressure head in the slip zone. Direct physical failure precursor per Terzaghi effective stress principle.", unit: "kPa", range: "0–120 kPa" },
                { name: "MEMS Inclinometer Drift", desc: "Surface angular drift velocity measured by Micro-Electro-Mechanical System tiltmeters embedded in the slope body.", unit: "°/hr", range: "0–0.12°/hr" },
                { name: "Volumetric Soil Moisture", desc: "Dielectric permittivity-based VWC probe measuring volumetric fraction of water in the regolith.", unit: "% VWC", range: "5–95%" },
                { name: "AWS Temperature", desc: "Near-surface temperature for freeze-thaw cycle detection in high-altitude Sikkim/Arunachal nodes.", unit: "°C", range: "−8 to 42°C" },
              ]
            },
          ].map(({ icon: Icon, iconColor, category, source, features }) => (
            <div key={category} className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm">
              <div className="flex items-center gap-3 mb-4 border-b border-borderColor pb-3">
                <div className={`p-2 rounded-xl bg-bgPrimary border border-borderColor ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-textPrimary uppercase">{category}</h3>
                  <p className="text-[9px] text-textSecondary">{source}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {features.map(f => (
                  <div key={f.name} className="p-3 bg-bgPrimary border border-borderColor rounded-xl">
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="font-black text-[10px] text-textPrimary">{f.name}</span>
                      <span className="text-[8px] font-mono font-bold text-textMuted bg-bgCard border border-borderColor px-1.5 py-0.5 rounded shrink-0 ml-1">{f.unit}</span>
                    </div>
                    <p className="text-[9px] text-textSecondary leading-snug font-semibold">{f.desc}</p>
                    <div className="mt-1.5 text-[8px] text-textMuted font-bold">Range: {f.range}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────── */}
      {/* SECTION 3: FUTURE ROADMAP TIMELINE                     */}
      {/* ─────────────────────────────────────────────────────── */}
      {activeSection === "roadmap" && (
        <div className="space-y-5">
          <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm">
            <div className="flex items-center gap-2 mb-5 border-b border-borderColor pb-3">
              <Satellite className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-xs text-textPrimary uppercase">NER EWS Enhancement Pipeline & Future Roadmap</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {ROADMAP_ITEMS.map(({ phase, label, color, icon: Icon, iconColor, title, items }) => (
                <div key={phase} className="p-4 bg-bgPrimary border border-borderColor rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${color}`}>{phase}</div>
                      <span className={`text-[8px] font-black uppercase border px-2 py-0.5 rounded ${
                        label === "Live" ? "border-alertGreen/30 text-alertGreen" :
                        label === "In Progress" ? "border-alertYellow/30 text-alertYellow" :
                        label === "Planned" ? "border-blue-500/30 text-blue-500" :
                        "border-purple-500/30 text-purple-500"
                      }`}>{label}</span>
                    </div>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <h4 className="font-extrabold text-sm text-textPrimary">{title}</h4>
                  <ul className="space-y-1.5">
                    {items.map(item => (
                      <li key={item} className="flex items-start gap-2 text-[10px] text-textSecondary font-semibold">
                        <ArrowRight className="w-3 h-3 shrink-0 mt-0.5 text-textMuted" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Citation & References */}
          <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm">
            <div className="flex items-center gap-2 mb-3 border-b border-borderColor pb-2">
              <Info className="w-4 h-4 text-blue-500" />
              <h3 className="font-extrabold text-[10px] text-textPrimary uppercase">Data Sources & Technical Citations</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { source: "GSI Landslide Catalog", detail: "Geological Survey of India — 30,842 NER landslide events (1998–2024)" },
                { source: "SRTM DEM 30m", detail: "NASA Shuttle Radar Topography Mission — Slope, elevation, aspect, curvature derivation" },
                { source: "IMD Gridded Rainfall", detail: "India Meteorological Department — 0.25° daily gridded rain product (1901–2024)" },
                { source: "MOSDAC GSMap", detail: "ISRO MOSDAC — GPM-based satellite rainfall estimation (GSMap NRT)" },
                { source: "NESAC Sentinel-1A SAR", detail: "North-East Space Applications Centre — C-Band SAR InSAR & classified inundation products" },
                { source: "OpenStreetMap", detail: "Road network proximity for infrastructure distance computation" },
                { source: "CGPB Lithology Maps", detail: "Central Ground Water Board — Rock type vulnerability class raster" },
                { source: "Supabase Postgres", detail: "Real-time sensor telemetry ingestion with PostGIS spatial indexing" },
              ].map(({ source, detail }) => (
                <div key={source} className="flex items-start gap-2 p-2.5 bg-bgPrimary border border-borderColor rounded-lg">
                  <CheckCircle2 className="w-3 h-3 text-alertGreen shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[9px] font-black text-textPrimary">{source}</div>
                    <div className="text-[8px] text-textSecondary font-semibold mt-0.5">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
