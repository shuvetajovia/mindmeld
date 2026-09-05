import React, { useState } from 'react';
import { Terrain3D } from '../components/Terrain3D';
import { useLiveTelemetry } from '../hooks/useLiveTelemetry';
import { CloudRain, Sun } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const TerrainAnalysisPage: React.FC = () => {
  const { sensors } = useLiveTelemetry(API_BASE_URL, 15000);
  const [weatherOn, setWeatherOn] = useState(false);

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center bg-slate-800 p-4 rounded-lg shadow border border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            3D Terrain Risk Analysis
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Visualizing real-time sensor data, infrastructure risks, and evacuation zones on 3D terrain.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300 font-medium">Weather System</span>
          <button 
            onClick={() => setWeatherOn(!weatherOn)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-colors ${
              weatherOn 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            {weatherOn ? <CloudRain size={18} /> : <Sun size={18} />}
            {weatherOn ? 'Rain Active' : 'Clear Sky'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 shadow overflow-hidden relative">
        <Terrain3D sensors={sensors} weatherOn={weatherOn} />
        
        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 bg-slate-900/80 p-4 rounded-lg border border-slate-600 backdrop-blur-sm pointer-events-none">
          <h4 className="text-sm font-bold text-white mb-3">Risk Indicators</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
              <span className="text-slate-200">Critical Risk (&gt;80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span>
              <span className="text-slate-200">High Risk (50-80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></span>
              <span className="text-slate-200">Moderate Risk (15-50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
              <span className="text-slate-200">Low Risk (&lt;15%)</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 border-2 border-red-500 rounded-full opacity-60"></span>
                <span className="text-slate-200">Evacuation Zone (High Risk)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
