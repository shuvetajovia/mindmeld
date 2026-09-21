import React from "react";
import { Network, Server, Shield, BrainCircuit, Users, CheckCircle2, ArrowRight, Database } from "lucide-react";

interface ProjectOverviewProps {
  onLaunchGIS: () => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({ onLaunchGIS }) => {
  return (
    <div className="p-6 max-w-[1600px] mx-auto text-textPrimary space-y-8 animate-fadeIn">
      {/* Header Section */}
      <div className="bg-bgCard rounded-3xl p-8 border border-borderColor shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-start gap-4">
          <div className="px-3 py-1.5 bg-blue-600/10 text-blue-600 border border-blue-600/20 rounded-lg text-xs font-black uppercase tracking-widest">
            MindMeld AI Disaster Resilience System • Developed by A Shuveta Jovi
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-tight">
            AI-Based Early Warning & Multi-Tier Landslide Risk Monitoring Grid
          </h1>
          <p className="text-sm md:text-base font-semibold text-textSecondary max-w-3xl leading-relaxed">
            An end-to-end intelligent disaster management grid designed to proactively mitigate landslide hazards in vulnerable mountainous regions through multi-tier AI fusion, satellite geomorphology (DEM), and real-time geotechnical IoT telemetry.
          </p>
          
          <button 
            onClick={onLaunchGIS}
            className="mt-4 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black uppercase transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2"
          >
            Launch Live GIS Command Center <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2-Column Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Traditional Approach */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Traditional Approach</h3>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Limitations</p>
            </div>
          </div>
          <ul className="space-y-4 text-sm font-semibold text-slate-600">
            <li className="flex items-start gap-3">
              <span className="text-red-500 mt-0.5">✕</span>
              Fragmented rain gauges providing delayed insights.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-500 mt-0.5">✕</span>
              Reactive manual reporting after infrastructure collapse.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-500 mt-0.5">✕</span>
              Isolated communities cut off for days due to lack of early warnings.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-500 mt-0.5">✕</span>
              Blocked road closures with zero detour routing intelligence.
            </li>
          </ul>
        </div>

        {/* Our Engineered Solution */}
        <div className="bg-white rounded-3xl p-8 border border-emerald-500/30 shadow-lg shadow-emerald-500/5 relative overflow-hidden ring-1 ring-emerald-500/10">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-6 border-b border-emerald-100 pb-4 relative z-10">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm border border-emerald-100">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Our Engineered Solution</h3>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Innovation</p>
            </div>
          </div>
          <ul className="space-y-4 text-sm font-semibold text-slate-700 relative z-10">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              Two-Tier Machine Learning framework fusing 30m SRTM digital elevation geomorphology.
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              Dynamic IMD rainfall matrices merged with live geotechnical telemetry (Piezometers + Inclinometers).
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              Automated Haversine proximity SMS broadcasts to mobile devices in hazard zones.
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              Real-time multi-terrain safe corridor routing to bypass imminent failures.
            </li>
          </ul>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="bg-bgCard rounded-3xl p-8 border border-borderColor shadow-sm">
        <h3 className="text-base font-extrabold text-slate-900 mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" /> System Performance & Coverage KPI Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">GSI Baseline Catalog</div>
            <div className="text-2xl font-black text-slate-900">30,842</div>
            <div className="text-xs font-semibold text-slate-600 mt-1">Historical Records Ingested</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Spatial Gen. ROC-AUC</div>
            <div className="text-2xl font-black text-blue-600">0.8891</div>
            <div className="text-xs font-semibold text-slate-600 mt-1">PR-AUC: 0.8552 | CSI: 0.5424</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Operational Precision</div>
            <div className="text-2xl font-black text-emerald-600">75.95%</div>
            <div className="text-xs font-semibold text-slate-600 mt-1">Calibrated OOF @ P &ge; 0.35</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">NER Terrain Coverage</div>
            <div className="text-2xl font-black text-slate-900">8 States</div>
            <div className="text-xs font-semibold text-slate-600 mt-1">40+ Urban, Rural & Lifeline Nodes</div>
          </div>
        </div>
      </div>
      
      {/* Flowchart Diagram Representation */}
      <div className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden text-center text-white">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">End-to-End Pipeline</h4>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2 text-sm font-bold">
          <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" /> Data Ingestion
          </div>
          <div className="hidden md:block text-slate-600">──►</div>
          <div className="md:hidden text-slate-600">▼</div>
          <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-emerald-400" /> AI Threat Core
          </div>
          <div className="hidden md:block text-slate-600">──►</div>
          <div className="md:hidden text-slate-600">▼</div>
          <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 flex items-center gap-2">
            <Network className="w-4 h-4 text-purple-400" /> Meta-Calibrator
          </div>
          <div className="hidden md:block text-slate-600">──►</div>
          <div className="md:hidden text-slate-600">▼</div>
          <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-400" /> Real-Time GIS & Dispatch
          </div>
        </div>
      </div>

    </div>
  );
};
