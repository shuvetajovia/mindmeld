import { useState, useEffect } from "react";
import { Dashboard } from "./pages/Dashboard";
import { EmergencyRouting } from "./pages/EmergencyRouting";
import { IoTSensorPage } from "./pages/IoTSensorPage";
import { PredictionCorePage } from "./pages/PredictionCorePage";
import { DataAnalysisPage } from "./pages/DataAnalysisPage";
import { FieldReport } from "./pages/FieldReport";
import { ProjectOverview } from "./pages/ProjectOverview";
import { TerrainAnalysisPage } from "./pages/TerrainAnalysisPage";
import { ThemeToggle } from "./components/ThemeToggle";
import { useLiveTelemetry } from "./hooks/useLiveTelemetry";
import { mockApi } from "./services/mockApi";
import { 
  LayoutDashboard, Compass, Radio, Cpu, Smartphone, Home,
  AlertTriangle, Clock, User, RefreshCw, X, ShieldAlert, SmartphoneNfc, Mountain
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface UserProfile {
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
}

// Haversine helper
function computeDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Navigation tabs definition
const NAV_TABS = [
  { key: "overview",     label: "Project Overview",icon: Home            },
  { key: "dashboard",    label: "Command Center",  icon: LayoutDashboard },
  { key: "terrain3d",    label: "3D Terrain",      icon: Mountain        },
  { key: "routing",      label: "Safe Routing",    icon: Compass         },
  { key: "iot",          label: "IoT Sensor Grid", icon: Radio           },
  { key: "prediction",   label: "Prediction Core", icon: Cpu             },
  { key: "reporting",    label: "Citizen Report",  icon: Smartphone      },
] as const;

type TabKey = typeof NAV_TABS[number]["key"];

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const { sensors, refresh } = useLiveTelemetry(API_BASE_URL, 15000);

  const [istTime, setIstTime] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(15);

  // Auth states
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [inputName, setInputName] = useState<string>("");
  const [inputPhone, setInputPhone] = useState<string>("");
  const [inputLat, setInputLat] = useState<string>("");
  const [inputLon, setInputLon] = useState<string>("");

  // Proximity Alert Banner States
  const [activeProximityAlert, setActiveProximityAlert] = useState<{
    distance: number;
    locationName: string;
    riskScore: number;
  } | null>(null);
  const [smsToast, setSmsToast] = useState<string | null>(null);

  // IST Clock
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour12: false,
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      };
      setIstTime(`IST: ${new Intl.DateTimeFormat("en-IN", options).format(new Date())}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { refresh(); return 15; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  // GPS capture
  const captureUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setInputLat(pos.coords.latitude.toFixed(5));
          setInputLon(pos.coords.longitude.toFixed(5));
        },
        () => {
          setInputLat("26.1445");
          setInputLon("91.7362");
        }
      );
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName || !inputPhone) return;
    setUserProfile({
      name: inputName,
      phone: inputPhone,
      latitude: parseFloat(inputLat) || 26.1445,
      longitude: parseFloat(inputLon) || 91.7362
    });
    setLoginModalOpen(false);
  };

  // Proximity alert computation using ML-based risk from sensor data
  useEffect(() => {
    if (!userProfile || sensors.length === 0) {
      setActiveProximityAlert(null);
      return;
    }

    let closestAlertNode: any = null;
    let minDistance = Infinity;

    sensors.forEach(node => {
      const SM = node.soil_moisture;
      const rain = node.rain_24h_obs;
      const pore = Math.min(120, SM * 0.9);
      const incl = Math.min(0.12, pore * 0.00055 + rain * 0.00025);
      const tVal = 0.018 * rain + 0.005 * node.api_7d + 0.022 * pore + 20.0 * incl - 1.95;
      const prob = 1 / (1 + Math.exp(-tVal)); // simplified T-only for proximity check
      const risk = prob > 0.80 ? 9.2 : prob > 0.50 ? 7.5 : prob > 0.15 ? 5.2 : 2.0;

      if (risk >= 7.0) {
        const dist = computeDistance(userProfile.latitude, userProfile.longitude, node.latitude, node.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          closestAlertNode = {
            distance: parseFloat(dist.toFixed(1)),
            locationName: node.name,
            riskScore: risk
          };
        }
      }
    });

    if (closestAlertNode && minDistance <= 15.0) {
      setActiveProximityAlert(closestAlertNode);
    } else {
      setActiveProximityAlert(null);
    }
  }, [userProfile, sensors]);

  const simulateNearKohima = () => {
    setInputName("Simulated Officer");
    setInputPhone("9988776655");
    setInputLat("25.6760");
    setInputLon("94.1120");
    setUserProfile({ name: "Simulated Officer", phone: "9988776655", latitude: 25.6760, longitude: 94.1120 });
    setLoginModalOpen(false);
  };

  const triggerSmsSimulation = () => {
    if (!userProfile || !activeProximityAlert) return;
    setSmsToast(`📲 SMS ALERT TRANSMITTED: Warning dispatch sent to +91-${userProfile.phone}. Hazard zone at ${activeProximityAlert.locationName} is ${activeProximityAlert.distance} km away.`);
    setTimeout(() => setSmsToast(null), 5000);
  };

  return (
    <div className="min-h-screen bg-bgPrimary text-textPrimary flex flex-col font-sans transition-colors duration-300">
      
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="border-b border-borderColor bg-bgCard/90 backdrop-blur-md sticky top-0 z-[99] px-6 py-3 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-sm">
        
        {/* Brand */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 shadow-md shadow-blue-500/10 shrink-0">
              <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
                MindMeld AI Landslide Resilience Grid
              </h1>
              <p className="text-[11px] font-semibold text-slate-500">
                AI Early Warning System • Developed by A Shuveta Jovi
              </p>
            </div>
          </div>
          <div className="lg:hidden"><ThemeToggle /></div>
        </div>

        {/* 6-Tab Navigation */}
        <nav className="flex items-center bg-bgPrimary border border-borderColor rounded-xl p-1 shrink-0 w-full lg:w-auto overflow-x-auto gap-0.5">
          {NAV_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition shrink-0 ${
                activeTab === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </nav>

        {/* Top Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-black text-textSecondary bg-bgPrimary border border-borderColor px-3 py-1.5 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-mono">{istTime}</span>
          </div>
          <div className="hidden lg:flex items-center gap-1 text-[10px] font-black text-textSecondary bg-bgPrimary border border-borderColor px-3 py-1.5 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
            <span className="font-mono">Sync: {countdown}s</span>
          </div>
          <div className="hidden lg:block"><ThemeToggle /></div>
          {userProfile ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-block text-[10px] font-black text-alertGreen bg-alertGreen/10 border border-alertGreen/20 px-3 py-1.5 rounded-xl">
                👤 {userProfile.name}
              </span>
              <button
                onClick={() => setUserProfile(null)}
                className="px-3 py-1.5 border border-borderColor bg-bgPrimary hover:bg-borderColor/40 text-textSecondary hover:text-textPrimary rounded-xl text-[10px] font-black uppercase transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => { captureUserLocation(); setLoginModalOpen(true); }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase transition shadow-md shadow-blue-500/10 flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" /> Officer Login
            </button>
          )}
        </div>
      </header>

      {/* ── PROXIMITY ALERT BANNER ──────────────────────────────────────── */}
      {userProfile && activeProximityAlert && (
        <div className="mx-6 mt-4 p-4 bg-alertRed/10 border border-alertRed/35 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-bounce-slow shadow-sm">
          <div className="flex items-center gap-3 text-xs md:text-sm font-semibold text-alertRed leading-snug">
            <ShieldAlert className="w-5 h-5 animate-pulse shrink-0" />
            <div>
              <span className="font-black uppercase tracking-wider block text-[10px] text-alertRed mb-0.5">⚠️ URGENT AREA WARNING:</span>
              You are currently <strong className="font-black font-mono">{activeProximityAlert.distance} km</strong> from an active Red Alert hazard zone at <strong className="underline">{activeProximityAlert.locationName}</strong>. Automated warning SMS queued to <strong className="font-mono">+91-{userProfile.phone}</strong>.
            </div>
          </div>
          <button
            onClick={triggerSmsSimulation}
            className="px-4 py-2.5 bg-alertRed hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1.5 shadow-md shadow-red-500/10 self-stretch md:self-auto justify-center"
          >
            <SmartphoneNfc className="w-3.5 h-3.5" /> Simulate SMS Warning
          </button>
        </div>
      )}

      {/* ── SMS TOAST ───────────────────────────────────────────────────── */}
      {smsToast && (
        <div className="fixed top-6 right-6 z-[99999] p-4 bg-bgCard border border-alertGreen rounded-2xl shadow-2xl flex items-start gap-3 w-full max-w-sm animate-slideIn">
          <div className="p-2 rounded-xl bg-alertGreen/15 text-alertGreen shrink-0 border border-alertGreen/20">
            <SmartphoneNfc className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black text-alertGreen uppercase tracking-wider">SMS TRANSMITTED OK</div>
            <p className="text-xs text-textSecondary font-semibold mt-1 leading-normal">{smsToast}</p>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="flex-grow">
        {activeTab === "overview"      && <ProjectOverview onLaunchGIS={() => setActiveTab("dashboard")} />}
        {activeTab === "dashboard"     && <Dashboard apiBaseUrl={API_BASE_URL} />}
        {activeTab === "terrain3d"     && <TerrainAnalysisPage />}
        {activeTab === "routing"       && <EmergencyRouting apiBaseUrl={API_BASE_URL} />}
        {activeTab === "iot"           && <IoTSensorPage apiBaseUrl={API_BASE_URL} />}
        {activeTab === "prediction"    && <PredictionCorePage apiBaseUrl={API_BASE_URL} />}
        {activeTab === "reporting"     && <FieldReport apiBaseUrl={API_BASE_URL} />}
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-borderColor bg-bgCard/60 py-5 text-center text-[10px] text-textSecondary space-y-1">
        <p className="font-black uppercase tracking-widest text-[9px] text-textMuted">
          MindMeld • AI Landslide Early Warning & Regional Resilience Network Grid
        </p>
        <p className="font-semibold">Developed & Designed by <span className="text-blue-600 font-bold">A Shuveta Jovi</span></p>
        <p className="text-textMuted text-[9px]">
          Multi-Tier ML Threat Engine • Real-time IoT Telemetry • Dynamic Route Optimization • Offline-Resilient
        </p>
      </footer>

      {/* ── OFFICER LOGIN MODAL ─────────────────────────────────────────── */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel bg-bgCard border border-borderColor rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-slideUp text-textPrimary">
            <div className="flex justify-between items-start border-b border-borderColor pb-3">
              <div>
                <h3 className="font-black text-sm text-textPrimary uppercase">Disaster Management Officer Login</h3>
                <p className="text-[9px] text-textSecondary">Input details to initialize automated proximity warnings</p>
              </div>
              <button onClick={() => setLoginModalOpen(false)}
                      className="p-1 rounded-lg border border-borderColor hover:bg-bgPrimary transition text-textSecondary hover:text-textPrimary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3 pt-1">
              <div>
                <label className="text-[9px] font-bold text-textMuted uppercase tracking-wider block mb-1">Full Name</label>
                <input type="text" required placeholder="Officer / Citizen Name" value={inputName}
                       onChange={(e) => setInputName(e.target.value)}
                       className="w-full px-3 py-2 rounded-xl bg-bgPrimary border border-borderColor text-xs font-semibold text-textPrimary focus:outline-none focus:border-blue-600" />
              </div>

              <div>
                <label className="text-[9px] font-bold text-textMuted uppercase tracking-wider block mb-1">Mobile Number (SMS warning)</label>
                <input type="tel" required pattern="[0-9]{10}" placeholder="10-Digit Mobile Phone" value={inputPhone}
                       onChange={(e) => setInputPhone(e.target.value)}
                       className="w-full px-3 py-2 rounded-xl bg-bgPrimary border border-borderColor text-xs font-semibold text-textPrimary focus:outline-none focus:border-blue-600 font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-textMuted uppercase tracking-wider block mb-1">Latitude</label>
                  <input type="text" required placeholder="e.g. 26.1445" value={inputLat}
                         onChange={(e) => setInputLat(e.target.value)}
                         className="w-full px-3 py-2 rounded-xl bg-bgPrimary border border-borderColor text-xs font-semibold text-textPrimary focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-textMuted uppercase tracking-wider block mb-1">Longitude</label>
                  <input type="text" required placeholder="e.g. 91.7362" value={inputLon}
                         onChange={(e) => setInputLon(e.target.value)}
                         className="w-full px-3 py-2 rounded-xl bg-bgPrimary border border-borderColor text-xs font-semibold text-textPrimary focus:outline-none font-mono" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={simulateNearKohima}
                        className="w-1/2 py-2 bg-bgPrimary hover:bg-borderColor/40 border border-borderColor text-[10px] font-black uppercase rounded-xl transition text-alertRed">
                  Simulate near Red Zone
                </button>
                <button type="submit"
                        className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-xl transition shadow-md shadow-blue-500/10">
                  Verify Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
