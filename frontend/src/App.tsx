import { useState, useEffect } from "react";
import { Dashboard } from "./pages/Dashboard";
import { EmergencyRouting } from "./pages/EmergencyRouting";
import { IoTSensorPage } from "./pages/IoTSensorPage";
import { PredictionCorePage } from "./pages/PredictionCorePage";
import { DataAnalysisPage } from "./pages/DataAnalysisPage";
import { FieldReport } from "./pages/FieldReport";
import { ProjectOverview } from "./pages/ProjectOverview";
import { TerrainAnalysisPage } from "./pages/TerrainAnalysisPage";
import { NERSimulationPage } from "./pages/NERSimulationPage";
import { ThemeToggle } from "./components/ThemeToggle";
import { useLiveTelemetry } from "./hooks/useLiveTelemetry";
import { syncOfficerToSupabase } from "./services/supabaseClient";
import { mockApi } from "./services/mockApi";
import { 
  LayoutDashboard, Compass, Radio, Cpu, Smartphone, Home,
  AlertTriangle, Clock, User, RefreshCw, X, ShieldAlert, SmartphoneNfc, Mountain, Sparkles, CheckCircle2, ShieldCheck, MapPin
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface UserProfile {
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
  role?: string;
  badge?: string;
}

const OFFICER_PRESETS = [
  {
    role: "NDRF Sector Commander",
    badge: "NDRF-01-NE",
    name: "Commander A. K. Sangma",
    phone: "9876543210",
    lat: "25.6751",
    lon: "94.1116",
    sector: "Kohima - Imphal Highway Sector (Red Alert Proximity)",
  },
  {
    role: "SDMA Incident Officer",
    badge: "SDMA-MEG-04",
    name: "Dr. B. Khongwir",
    phone: "9862100451",
    lat: "25.5788",
    lon: "91.8933",
    sector: "East Khasi Hills & Cherrapunji Sector",
  },
  {
    role: "BRO Task Force Commander",
    badge: "BRO-SWASTIK",
    name: "Col. V. Sharma",
    phone: "9434022819",
    lat: "27.5088",
    lon: "88.5338",
    sector: "North Sikkim NH-10 / Mangan Corridor",
  },
  {
    role: "GSI Chief Field Geologist",
    badge: "GSI-NER-GEO",
    name: "Dr. T. Jamir",
    phone: "9436001284",
    lat: "26.1445",
    lon: "91.7362",
    sector: "Guwahati Regional Disaster Hub",
  }
];

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
  { key: "overview",     label: "Project Overview",  icon: Home            },
  { key: "simulation",   label: "NER 3D Simulation", icon: Sparkles        },
  { key: "dashboard",    label: "Command Center",    icon: LayoutDashboard },
  { key: "terrain3d",    label: "3D Terrain",        icon: Mountain        },
  { key: "routing",      label: "Safe Routing",      icon: Compass         },
  { key: "iot",          label: "IoT Sensor Grid",   icon: Radio           },
  { key: "prediction",   label: "Prediction Core",   icon: Cpu             },
  { key: "reporting",    label: "Citizen Report",    icon: Smartphone      },
] as const;

type TabKey = typeof NAV_TABS[number]["key"];

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const { sensors, refresh } = useLiveTelemetry(API_BASE_URL, 15000);

  const [istTime, setIstTime] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(15);

  // Auth states
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("mindmeld_officer_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeLoginTab, setActiveLoginTab] = useState<"preset" | "custom">("preset");
  const [inputName, setInputName] = useState<string>("");
  const [inputPhone, setInputPhone] = useState<string>("");
  const [inputLat, setInputLat] = useState<string>("");
  const [inputLon, setInputLon] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Proximity Alert Banner States
  const [activeProximityAlert, setActiveProximityAlert] = useState<{
    distance: number;
    locationName: string;
    riskScore: number;
  } | null>(null);
  const [smsToast, setSmsToast] = useState<string | null>(null);

  // Load / Sync profile
  const saveAndApplyProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem("mindmeld_officer_user", JSON.stringify(profile));
    setLoginModalOpen(false);
    setIsSyncing(true);
    await syncOfficerToSupabase({
      name: profile.name,
      phone: profile.phone,
      latitude: profile.latitude,
      longitude: profile.longitude,
    });
    setIsSyncing(false);
    setSmsToast(`🛡️ Officer Verified: ${profile.name} registered with live GPS geofencing.`);
    setTimeout(() => setSmsToast(null), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem("mindmeld_officer_user");
    setUserProfile(null);
    setActiveProximityAlert(null);
    setSmsToast("Officer session cleared.");
    setTimeout(() => setSmsToast(null), 3000);
  };


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

  const handleCustomLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName || !inputPhone) return;
    const profile: UserProfile = {
      name: inputName,
      phone: inputPhone,
      latitude: parseFloat(inputLat) || 26.1445,
      longitude: parseFloat(inputLon) || 91.7362,
      role: "Field Response Officer",
      badge: "DUTY-ACTIVE"
    };
    await saveAndApplyProfile(profile);
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
              <h1 className="text-base font-bold tracking-tight text-textPrimary leading-tight">
                MindMeld AI Landslide Resilience Grid
              </h1>
              <p className="text-[11px] font-semibold text-textSecondary">
                AI Early Warning System • Developed by A Shuveta Jovi
              </p>
            </div>
          </div>
          <div className="lg:hidden"><ThemeToggle /></div>
        </div>

        {/* Tab Navigation */}
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
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <div className="text-left">
                  <div className="text-[10px] font-black text-emerald-500 leading-none">
                    {userProfile.name}
                  </div>
                  <div className="text-[8px] font-bold text-textMuted uppercase tracking-wider">
                    {userProfile.role || "Officer Active"}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 border border-borderColor bg-bgPrimary hover:bg-borderColor/40 text-textSecondary hover:text-textPrimary rounded-xl text-[10px] font-black uppercase transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => { captureUserLocation(); setLoginModalOpen(true); }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase transition shadow-md shadow-blue-500/10 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Officer Login
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
              Officer <strong className="underline">{userProfile.name}</strong> is currently <strong className="font-black font-mono">{activeProximityAlert.distance} km</strong> from an active Red Alert hazard zone at <strong className="underline">{activeProximityAlert.locationName}</strong>. Automated warning SMS dispatched to <strong className="font-mono">+91-{userProfile.phone}</strong>.
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
            <div className="text-[10px] font-black text-alertGreen uppercase tracking-wider">DISASTER OPS NOTIFICATION</div>
            <p className="text-xs text-textSecondary font-semibold mt-1 leading-normal">{smsToast}</p>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="flex-grow">
        {activeTab === "overview"      && <ProjectOverview onLaunchGIS={() => setActiveTab("dashboard")} onLaunchSimulation={() => setActiveTab("simulation")} />}
        {activeTab === "simulation"    && <NERSimulationPage />}
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
          <div className="glass-panel bg-bgCard border border-borderColor rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-slideUp text-textPrimary">
            <div className="flex justify-between items-start border-b border-borderColor pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-600/10 text-blue-600 rounded-lg">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <h3 className="font-black text-sm text-textPrimary uppercase tracking-wide">
                    Disaster Management Officer Portal
                  </h3>
                </div>
                <p className="text-[10px] text-textSecondary mt-0.5">
                  Synchronize officer profile with Supabase DB for geofenced proximity alerting
                </p>
              </div>
              <button onClick={() => setLoginModalOpen(false)}
                      className="p-1 rounded-lg border border-borderColor hover:bg-bgPrimary transition text-textSecondary hover:text-textPrimary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Login Method */}
            <div className="flex bg-bgPrimary p-1 rounded-xl border border-borderColor gap-1 text-[10px] font-black uppercase">
              <button
                type="button"
                onClick={() => setActiveLoginTab("preset")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  activeLoginTab === "preset"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                Official Duty Roster (1-Click)
              </button>
              <button
                type="button"
                onClick={() => setActiveLoginTab("custom")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  activeLoginTab === "custom"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                Custom Officer / GPS
              </button>
            </div>

            {activeLoginTab === "preset" ? (
              <div className="space-y-2.5 pt-1 max-h-[320px] overflow-y-auto pr-1">
                <p className="text-[10px] font-semibold text-textMuted">
                  Select your active operational sector to initialize automatic proximity hazard telemetry:
                </p>
                {OFFICER_PRESETS.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() =>
                      saveAndApplyProfile({
                        name: preset.name,
                        phone: preset.phone,
                        latitude: parseFloat(preset.lat),
                        longitude: parseFloat(preset.lon),
                        role: preset.role,
                        badge: preset.badge
                      })
                    }
                    className="p-3 bg-bgPrimary hover:bg-blue-600/10 border border-borderColor hover:border-blue-500 rounded-2xl cursor-pointer transition flex items-center justify-between group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-textPrimary group-hover:text-blue-500">
                          {preset.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-600/15 text-blue-500 font-mono text-[8px] font-bold">
                          {preset.badge}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-textSecondary">
                        {preset.role} • <span className="font-mono">+91-{preset.phone}</span>
                      </div>
                      <div className="text-[9px] font-medium text-textMuted flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-blue-500" /> {preset.sector}
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase transition shrink-0">
                      Login
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleCustomLoginSubmit} className="space-y-3 pt-1">
                <div>
                  <label className="text-[9px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                    Officer / Responder Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Insp. Lalrintluanga (Mizoram DM)"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-bgPrimary border border-borderColor text-xs font-semibold text-textPrimary focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                    Mobile Number (SMS warning channel)
                  </label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    placeholder="10-Digit Mobile Phone"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-bgPrimary border border-borderColor text-xs font-semibold text-textPrimary focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                      Latitude
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 25.6760"
                      value={inputLat}
                      onChange={(e) => setInputLat(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-bgPrimary border border-borderColor text-xs font-semibold text-textPrimary focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-textMuted uppercase tracking-wider block mb-1">
                      Longitude
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 94.1120"
                      value={inputLon}
                      onChange={(e) => setInputLon(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-bgPrimary border border-borderColor text-xs font-semibold text-textPrimary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={captureUserLocation}
                    className="w-1/2 py-2 bg-bgPrimary hover:bg-borderColor/40 border border-borderColor text-[9px] font-black uppercase rounded-xl transition text-textSecondary flex items-center justify-center gap-1"
                  >
                    <MapPin className="w-3 h-3 text-blue-500" /> Detect Live GPS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputName("Simulated Officer");
                      setInputPhone("9988776655");
                      setInputLat("25.6760");
                      setInputLon("94.1120");
                    }}
                    className="w-1/2 py-2 bg-bgPrimary hover:bg-borderColor/40 border border-borderColor text-[9px] font-black uppercase rounded-xl transition text-alertRed"
                  >
                    Set Kohima Red Zone
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-xl transition shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isSyncing ? "Syncing with Supabase..." : "Verify & Connect Officer"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
