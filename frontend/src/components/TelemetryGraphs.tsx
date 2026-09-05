import React, { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ReferenceArea } from "recharts";
import { SensorNodeData } from "../hooks/useLiveTelemetry";
import { Compass, Activity, Droplets, CloudRain } from "lucide-react";

interface TelemetryGraphsProps {
  selectedSensor: SensorNodeData | null;
  refreshCounter: number;
}

interface HistoricalDataPoint {
  time: string;
  drift: number;     // Inclinometer angular drift (°/hr)
  pressure: number;  // Piezometer pore-water pressure (kPa)
  moisture: number;  // Volumetric soil moisture (VWC %)
  rain: number;      // 24h Rain Gauge (mm)
}

export const TelemetryGraphs: React.FC<TelemetryGraphsProps> = ({ selectedSensor, refreshCounter }) => {
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);

  // Generate historical data on mount or sensor change
  useEffect(() => {
    if (!selectedSensor) return;

    const baseMoisture = selectedSensor.soil_moisture;
    const baseRain = selectedSensor.rain_24h_obs;
    
    // Calibrated safe drift scaling: max around 0.11 in extreme cases
    const baseDrift = baseRain > 150 ? 0.095 : baseRain > 80 ? 0.065 : baseRain > 40 ? 0.035 : 0.015;
    // Calibrated pore pressure scaling: baseline at 15-35, rises under rain
    const basePressure = 20 + (baseRain * 0.32) + (baseMoisture * 0.15);

    const generateHistory = (): HistoricalDataPoint[] => {
      const data: HistoricalDataPoint[] = [];
      const now = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 3600 * 1000);
        const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Add smooth transitions back in time
        const ratio = (12 - i) / 12;
        const rainVal = Math.max(0, Math.min(250, baseRain * ratio + (Math.random() - 0.5) * 4));
        const SMVal = Math.max(0, Math.min(100, baseMoisture - (i * 0.6) + (Math.random() - 0.5) * 1.5));
        const driftVal = Math.max(0.002, Math.min(0.12, baseDrift - (i * 0.003) + (Math.random() - 0.5) * 0.005));
        const pressVal = Math.max(0, Math.min(120, basePressure - (i * 1.2) + (Math.random() - 0.5) * 2));

        data.push({
          time: timeStr,
          drift: parseFloat(driftVal.toFixed(4)),
          pressure: parseFloat(pressVal.toFixed(1)),
          moisture: parseFloat(SMVal.toFixed(1)),
          rain: parseFloat(rainVal.toFixed(1))
        });
      }
      return data;
    };

    setHistoryData(generateHistory());
  }, [selectedSensor]);

  // Append new dynamic updates
  useEffect(() => {
    if (!selectedSensor || historyData.length === 0) return;

    const SM = selectedSensor.soil_moisture;
    const rain = selectedSensor.rain_24h_obs;
    
    const drift = rain > 150 
      ? 0.09 + Math.random() * 0.015 
      : rain > 80 
        ? 0.055 + Math.random() * 0.01 
        : 0.01 + Math.random() * 0.015;

    const pressure = 22 + (rain * 0.3) + (SM * 0.15) + (Math.random() - 0.5) * 1.5;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newPoint: HistoricalDataPoint = {
      time: timeStr,
      drift: parseFloat(Math.max(0.001, Math.min(0.12, drift)).toFixed(4)),
      pressure: parseFloat(Math.max(0, Math.min(120, pressure)).toFixed(1)),
      moisture: parseFloat(Math.max(0, Math.min(100, SM)).toFixed(1)),
      rain: parseFloat(Math.max(0, Math.min(250, rain)).toFixed(1))
    };

    setHistoryData(prev => [...prev.slice(1), newPoint]);
  }, [refreshCounter]);

  if (!selectedSensor) {
    return (
      <div className="py-12 text-center text-textMuted border border-dashed border-borderColor rounded-2xl bg-bgCard/40">
        <p className="text-xs font-semibold">Select an IoT telemetry node above to render real-time sensor streams.</p>
      </div>
    );
  }

  const chartMargins = { top: 15, right: 10, left: -25, bottom: 0 };
  const tooltipContentStyle = {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    color: "var(--text-primary)",
    fontSize: "11px",
    fontFamily: "inherit"
  };

  return (
    <div className="space-y-6">
      {/* Sensor Title Bar */}
      <div className="flex items-center justify-between border-b border-borderColor pb-3 mb-1">
        <div>
          <h3 className="font-extrabold text-sm text-textPrimary uppercase">{selectedSensor.name}</h3>
          <p className="text-[10px] text-textSecondary font-bold">Node ID: {selectedSensor.id} • Lat: {selectedSensor.latitude.toFixed(4)}, Lon: {selectedSensor.longitude.toFixed(4)}</p>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-alertGreen bg-alertGreen/10 border border-alertGreen/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-alertGreen animate-pulse"></span> STREAMING ACTIVE
        </span>
      </div>

      {/* Grid of 4 Recharts Area Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. MEMS Inclinometer Angular Drift */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col bg-bgCard">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 shrink-0">
              <Compass className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-black text-xs text-textPrimary uppercase">Inclinometer Surface Drift</h4>
              <p className="text-[9px] text-textSecondary">Angular rate of displacement drift (°/hr)</p>
            </div>
          </div>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={chartMargins}>
                <defs>
                  <linearGradient id="colorDrift" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.25} />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 0.12]} ticks={[0, 0.04, 0.08, 0.12]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} unit="°" />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Area type="monotone" dataKey="drift" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDrift)" />
                {/* Green Normal Baseline (< 0.02) */}
                <ReferenceArea y1={0} y2={0.02} fill="#10B981" fillOpacity={0.06} label={{ value: 'Normal (<0.02)', fill: '#10B981', position: 'insideLeft', fontSize: 8, fontWeight: 700 }} />
                {/* Amber Warning Corridor (0.04 - 0.06) */}
                <ReferenceArea y1={0.04} y2={0.06} fill="#F59E0B" fillOpacity={0.06} label={{ value: 'Warning (0.04-0.06)', fill: '#F59E0B', position: 'insideLeft', fontSize: 8, fontWeight: 700 }} />
                {/* Red Pulse Alert (> 0.08) */}
                <ReferenceLine y={0.08} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Alarm (>0.08)', fill: '#EF4444', position: 'insideTopRight', fontSize: 8, fontWeight: 700 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Piezometer Pore Pressure */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col bg-bgCard">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-1.5 rounded-lg bg-purple-600/10 text-purple-600 shrink-0">
              <Activity className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-black text-xs text-textPrimary uppercase">Pore-Water Piezometer Pressure</h4>
              <p className="text-[9px] text-textSecondary">Internal pore-water seepage pressure (kPa)</p>
            </div>
          </div>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={chartMargins}>
                <defs>
                  <linearGradient id="colorPressure" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.25} />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 120]} ticks={[0, 30, 60, 90, 120]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} unit="k" />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Area type="monotone" dataKey="pressure" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPressure)" />
                {/* Normal baseline area shading (15 - 35 kPa) */}
                <ReferenceArea y1={15} y2={35} fill="#10B981" fillOpacity={0.08} label={{ value: 'Baseline (15-35 kPa)', fill: '#10B981', position: 'insideLeft', fontSize: 9, fontWeight: 700 }} />
                {/* Warning threshold line at 50 kPa */}
                <ReferenceLine y={50} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Warning (50 kPa)', fill: '#F59E0B', position: 'insideTopRight', fontSize: 9, fontWeight: 700 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Soil Volumetric Water Content */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col bg-bgCard">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-600 shrink-0">
              <Droplets className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-black text-xs text-textPrimary uppercase">Soil Moisture (VWC %)</h4>
              <p className="text-[9px] text-textSecondary">Volumetric moisture ratio (0% - 100%)</p>
            </div>
          </div>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={chartMargins}>
                <defs>
                  <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.25} />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} unit="%" />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Area type="monotone" dataKey="moisture" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMoisture)" />
                {/* Saturation Reference line at 70% */}
                <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'Saturation (70%)', fill: '#EF4444', position: 'insideBottomRight', fontSize: 9, fontWeight: 700 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Weather Station Rainfall Accumulation */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col bg-bgCard">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-1.5 rounded-lg bg-amber-600/10 text-amber-600 shrink-0">
              <CloudRain className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-black text-xs text-textPrimary uppercase">Weather Precipitation (24h)</h4>
              <p className="text-[9px] text-textSecondary">Precipitation rain accumulation (mm)</p>
            </div>
          </div>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={chartMargins}>
                <defs>
                  <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.25} />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 250]} ticks={[0, 50, 100, 150, 200, 250]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} unit="m" />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Area type="monotone" dataKey="rain" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRain)" />
                {/* Heavy rain threshold at 100mm */}
                <ReferenceLine y={100} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'Heavy Rain (100mm)', fill: '#EF4444', position: 'insideBottomRight', fontSize: 9, fontWeight: 700 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
