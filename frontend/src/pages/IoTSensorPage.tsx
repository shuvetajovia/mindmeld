import React, { useState } from "react";
import { Radio, RefreshCw, Activity, Cpu, Info, Zap } from "lucide-react";
import { useLiveTelemetry } from "../hooks/useLiveTelemetry";
import { AlertsBanner } from "../components/AlertsBanner";
import { TelemetryGraphs } from "../components/TelemetryGraphs";
import { SensorCorrelationMatrix } from "../components/SensorCorrelationMatrix";

interface IoTSensorPageProps {
  apiBaseUrl: string;
}

export const IoTSensorPage: React.FC<IoTSensorPageProps> = ({ apiBaseUrl }) => {
  const { sensors, alerts, loading, refresh } = useLiveTelemetry(apiBaseUrl, 10000);
  const [selectedSensorId, setSelectedSensorId] = useState<string>("SN-NGL-KOH-01");
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  const selectedSensor = sensors.find(s => s.id === selectedSensorId) || sensors[0] || null;

  const handleRefresh = () => {
    setRefreshCounter(prev => prev + 1);
    refresh();
  };

  // Compute derived alert status from selected sensor
  const getSensorAlertStatus = () => {
    if (!selectedSensor) return { label: "No Data", color: "text-textMuted", bg: "bg-bgPrimary" };
    const SM = selectedSensor.soil_moisture;
    const rain = selectedSensor.rain_24h_obs;
    // Approximate pore pressure from VWC
    const pore = Math.min(120, SM * 0.9);
    const incl = Math.min(0.12, pore * 0.00055 + rain * 0.00025);

    if (SM > 50 || rain > 150 || pore > 80) return { label: "CRITICAL RED", color: "text-alertRed", bg: "bg-alertRed/10 border-alertRed/25 animate-pulse-slow" };
    if (SM > 40 || rain > 90 || pore > 50)  return { label: "HIGH ORANGE", color: "text-alertOrange", bg: "bg-alertOrange/10 border-alertOrange/20" };
    if (SM > 30 || rain > 40)                return { label: "CAUTION YELLOW", color: "text-alertYellow", bg: "bg-alertYellow/10 border-alertYellow/20" };
    return { label: "NOMINAL GREEN", color: "text-alertGreen", bg: "bg-alertGreen/10 border-alertGreen/20" };
  };

  const alertStatus = getSensorAlertStatus();

  // Group sensors by state for the dropdown
  const stateGroups: Record<string, typeof sensors> = {};
  sensors.forEach(s => {
    const parts = s.id.split("-");
    const key = parts[1] || "OTHER";
    if (!stateGroups[key]) stateGroups[key] = [];
    stateGroups[key].push(s);
  });

  const stateLabels: Record<string, string> = {
    ASM: "Assam", MEG: "Meghalaya", SKM: "Sikkim", NGL: "Nagaland",
    MZR: "Mizoram", MNP: "Manipur", ARN: "Arunachal Pradesh", TPR: "Tripura"
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-textPrimary">
      {/* Alerts Banner */}
      <AlertsBanner alerts={alerts} />

      {/* Page Header + Station Selector */}
      <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-600 border border-blue-600/15 shadow-sm shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-textPrimary uppercase tracking-tight">
                IoT Sensor Grid & Telemetry
              </h2>
              <p className="text-[10px] text-textSecondary leading-snug mt-0.5">
                {sensors.length} active IoT nodes across all 8 NER states — MEMS inclinometers, piezometers, AWS rain gauges, and VWC probes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Alert Status Badge */}
            <div className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider ${alertStatus.bg} ${alertStatus.color}`}>
              {alertStatus.label}
            </div>

            {/* Station Selector */}
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-textMuted uppercase mb-1">Select Monitoring Station</span>
              <select
                value={selectedSensorId}
                onChange={(e) => setSelectedSensorId(e.target.value)}
                className="bg-bgPrimary border border-borderColor rounded-xl px-3 py-1.5 text-xs font-semibold text-textPrimary focus:outline-none focus:border-blue-600 min-w-[220px]"
              >
                {Object.entries(stateGroups).map(([code, nodes]) => (
                  <optgroup key={code} label={`── ${stateLabels[code] || code} (${nodes.length} nodes) ──`}>
                    {nodes.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <button
              onClick={handleRefresh}
              className="px-3 py-2 border border-borderColor bg-bgPrimary hover:bg-borderColor/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm self-end mt-[18px]"
              title="Poll sensor stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Sync
            </button>
          </div>
        </div>

        {/* Selected Station Summary Bar */}
        {selectedSensor && (
          <div className="mt-4 pt-4 border-t border-borderColor grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Soil VWC", value: `${selectedSensor.soil_moisture.toFixed(1)}%`, color: "text-blue-600" },
              { label: "24h Rain", value: `${selectedSensor.rain_24h_obs.toFixed(1)} mm`, color: "text-indigo-600" },
              { label: "48h Rain", value: `${selectedSensor.rain_48h_prior.toFixed(1)} mm`, color: "text-slate-600" },
              { label: "7d Rain", value: `${selectedSensor.rain_7d_prior.toFixed(1)} mm`, color: "text-slate-500" },
              { label: "API 7d", value: `${selectedSensor.api_7d.toFixed(1)} mm`, color: "text-purple-600" },
              { label: "Rain Anomaly", value: `${selectedSensor.r24_seasonal_anom.toFixed(1)} mm`, color: selectedSensor.r24_seasonal_anom > 20 ? "text-alertOrange" : "text-textPrimary" },
              { label: "Node ID", value: selectedSensor.id, color: "text-textMuted font-mono text-[9px]" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-bgPrimary border border-borderColor rounded-xl p-2.5 text-center">
                <div className="text-[8px] font-bold text-textMuted uppercase mb-0.5">{label}</div>
                <div className={`text-xs font-black ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4 Calibrated Telemetry Charts */}
      <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-borderColor pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600">
              <Activity className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-xs text-textPrimary uppercase">Real-Time In-Situ Sensor Telemetry</h3>
              <p className="text-[9px] text-textSecondary">12-hour rolling time window • 15-minute sampling interval • Auto-refreshing</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-bold text-textMuted">
            <div className="w-2 h-2 rounded-full bg-alertGreen animate-pulse" />
            Live Feed Active
          </div>
        </div>

        {selectedSensor ? (
          <TelemetryGraphs selectedSensor={selectedSensor} refreshCounter={refreshCounter} />
        ) : (
          <div className="h-48 flex items-center justify-center text-textMuted font-bold text-sm">
            Loading sensor data…
          </div>
        )}
      </div>

      {/* Sensor Calibration Reference Card */}
      <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-borderColor pb-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600"><Zap className="w-4 h-4" /></span>
          <div>
            <h3 className="font-extrabold text-xs text-textPrimary uppercase">Geotechnical Sensor Calibration Reference</h3>
            <p className="text-[9px] text-textSecondary">Bureau of Indian Standards (BIS) & IMD operational thresholds</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              sensor: "MEMS Inclinometer",
              unit: "°/hr surface drift",
              zones: [
                { label: "Normal", range: "< 0.02°/hr", color: "text-alertGreen bg-alertGreen/10 border-alertGreen/20" },
                { label: "Warning", range: "0.04–0.06°/hr", color: "text-alertYellow bg-alertYellow/10 border-alertYellow/20" },
                { label: "Alarm", range: "> 0.08°/hr", color: "text-alertRed bg-alertRed/10 border-alertRed/20 animate-pulse-slow" },
              ]
            },
            {
              sensor: "Piezometer",
              unit: "kPa pore-water seepage",
              zones: [
                { label: "Baseline", range: "15–35 kPa", color: "text-alertGreen bg-alertGreen/10 border-alertGreen/20" },
                { label: "Warning", range: "> 50 kPa", color: "text-alertYellow bg-alertYellow/10 border-alertYellow/20" },
                { label: "Critical", range: "> 90 kPa", color: "text-alertRed bg-alertRed/10 border-alertRed/20" },
              ]
            },
            {
              sensor: "Soil VWC Probe",
              unit: "% volumetric moisture",
              zones: [
                { label: "Dry", range: "< 30%", color: "text-alertGreen bg-alertGreen/10 border-alertGreen/20" },
                { label: "Moist", range: "30–50%", color: "text-alertYellow bg-alertYellow/10 border-alertYellow/20" },
                { label: "Saturated", range: "> 70%", color: "text-alertRed bg-alertRed/10 border-alertRed/20" },
              ]
            },
            {
              sensor: "AWS Rain Gauge",
              unit: "mm 24h accumulation",
              zones: [
                { label: "Light", range: "< 40 mm", color: "text-alertGreen bg-alertGreen/10 border-alertGreen/20" },
                { label: "Heavy", range: "40–100 mm", color: "text-alertYellow bg-alertYellow/10 border-alertYellow/20" },
                { label: "Extreme", range: "> 100 mm", color: "text-alertRed bg-alertRed/10 border-alertRed/20" },
              ]
            },
          ].map(({ sensor, unit, zones }) => (
            <div key={sensor} className="p-3 bg-bgPrimary border border-borderColor rounded-xl space-y-2">
              <div className="font-black text-[10px] text-textPrimary uppercase">{sensor}</div>
              <div className="text-[8px] text-textMuted font-semibold italic mb-1">{unit}</div>
              <div className="space-y-1">
                {zones.map(z => (
                  <div key={z.label} className={`px-2 py-1 rounded text-[8px] font-black border flex justify-between ${z.color}`}>
                    <span>{z.label}</span>
                    <span className="font-mono">{z.range}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-Sensor Correlation Matrix */}
      <div className="glass-panel rounded-2xl p-5 bg-bgCard border border-borderColor shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-borderColor pb-2">
          <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
            <Cpu className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-extrabold text-xs text-textPrimary uppercase">In-Situ Sensor Correlation Matrix</h3>
            <p className="text-[9px] text-textSecondary">Live Pearson-r cross-correlation analysis: Pore Pressure + Inclinometer + VWC + Rain24h</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[9px] font-bold text-textMuted">
            <Info className="w-3 h-3 text-blue-500" />
            Simultaneous threshold breach = slope mobilization warning
          </div>
        </div>

        {selectedSensor ? (
          <SensorCorrelationMatrix sensors={sensors} selectedSensorId={selectedSensorId} />
        ) : (
          <div className="h-24 flex items-center justify-center text-textMuted font-bold text-sm">
            Select a sensor station to compute correlations.
          </div>
        )}
      </div>
    </div>
  );
};
