import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { MapContainer, TileLayer, WMSTileLayer, Polyline, CircleMarker, Popup, Marker, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { 
  Play, Pause, RotateCcw, FastForward, SkipForward, ArrowRight,
  ShieldAlert, CloudRain, Droplets, Gauge, Activity, Navigation, 
  MapPin, CheckCircle2, AlertTriangle, Radio, Sparkles as SparklesIcon,
  Maximize2, Minimize2, ChevronRight, Layers, Mountain, Compass, Send, Eye
} from 'lucide-react';
import { useLiveTelemetry, SensorNodeData } from '../hooks/useLiveTelemetry';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Custom Leaflet icons
const greenMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [24, 38],
  iconAnchor: [12, 38],
  popupAnchor: [1, -34],
  shadowSize: [38, 38]
});

const redMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [24, 38],
  iconAnchor: [12, 38],
  popupAnchor: [1, -34],
  shadowSize: [38, 38]
});

// Simulation Stages
export type SimStage = 1 | 2 | 3 | 4 | 5;

interface ScenarioPreset {
  id: string;
  name: string;
  state: string;
  location: string;
  coordinates: [number, number];
  zoom: number;
  criticalCorridor: string;
  description: string;
  geology: string;
  initialFoS: number;
  triggerRainfall: number;
  affectedPopulation: string;
  detourRoute: {
    name: string;
    waypoints: [number, number][];
    blockedSegment: [number, number][];
  };
}

const NER_SCENARIOS: ScenarioPreset[] = [
  {
    id: "sikkim-teesta",
    name: "Sikkim Teesta Valley Slope Washout",
    state: "Sikkim",
    location: "Mangan - Chungthang - NH-10 Corridor",
    coordinates: [27.50, 88.55],
    zoom: 9.5,
    criticalCorridor: "NH-10 (Sevoke to Gangtok Lifeline)",
    description: "Intense monsoonal cloudburst triggering torrential pore pressure spikes across fragile gneissic colluvium slopes.",
    geology: "High-grade Gneiss, Phyllites & Deep Colluvial Scree",
    initialFoS: 1.65,
    triggerRainfall: 195,
    affectedPopulation: "45,000 citizens & army supply lines",
    detourRoute: {
      name: "NH-717A Alternative Bypass via Lava - Rhenock",
      waypoints: [
        [27.33, 88.61], [27.25, 88.67], [27.18, 88.72], [27.08, 88.65], [26.90, 88.50]
      ],
      blockedSegment: [
        [27.33, 88.61], [27.20, 88.52], [27.05, 88.48], [26.90, 88.45]
      ]
    }
  },
  {
    id: "assam-dimahasao",
    name: "Dima Hasao Railway Cut Mudslump",
    state: "Assam",
    location: "Haflong - Jatinga Hill Section",
    coordinates: [25.18, 93.02],
    zoom: 10,
    criticalCorridor: "Lumding - Badarpur Strategic Railway Link",
    description: "Deep-seated rotational mudslump destabilizing critical mountain railway tracks and NH-27 bypass.",
    geology: "Soft Disang Shales, Sandstone Intercalations",
    initialFoS: 1.55,
    triggerRainfall: 175,
    affectedPopulation: "Barak Valley connectivity (3.6M people)",
    detourRoute: {
      name: "NH-27 Highway Emergency Truck Corridor",
      waypoints: [
        [25.18, 93.02], [25.25, 93.15], [25.35, 93.20], [25.50, 93.10]
      ],
      blockedSegment: [
        [25.18, 93.02], [25.10, 92.95], [25.00, 92.88]
      ]
    }
  },
  {
    id: "meghalaya-cherra",
    name: "Cherrapunji Escarpment Saturation",
    state: "Meghalaya",
    location: "Sohra - Mawsmai Cliff Zone",
    coordinates: [25.28, 91.73],
    zoom: 10.5,
    criticalCorridor: "Shillong - Sohra Scenic Highway",
    description: "World's highest precipitation belt causing rapid groundwater table surge and limestone escarpment slumping.",
    geology: "Sedimentary Limestone, Calcareous Sandstone",
    initialFoS: 1.70,
    triggerRainfall: 260,
    affectedPopulation: "18,000 residents & eco-tourism corridor",
    detourRoute: {
      name: "Mawkdok - Laitryngew Ridge Detour",
      waypoints: [
        [25.28, 91.73], [25.35, 91.75], [25.42, 91.80], [25.50, 91.88]
      ],
      blockedSegment: [
        [25.28, 91.73], [25.20, 91.68], [25.15, 91.65]
      ]
    }
  },
  {
    id: "mizoram-aizawl",
    name: "Aizawl Urban Slump Escarpment",
    state: "Mizoram",
    location: "Aizawl Municipal Ridge - Ramhlun",
    coordinates: [23.73, 92.71],
    zoom: 11,
    criticalCorridor: "NH-54 Silchar - Aizawl Supply Highway",
    description: "High-density urban terraced slopes vulnerable to monsoonal toe erosion and shear strength collapse.",
    geology: "Bhuban Formation Sandstone & Siltstones",
    initialFoS: 1.48,
    triggerRainfall: 165,
    affectedPopulation: "320,000 urban population",
    detourRoute: {
      name: "Tanhril - Sairang Bypass Route",
      waypoints: [
        [23.73, 92.71], [23.77, 92.68], [23.80, 92.65], [23.85, 92.60]
      ],
      blockedSegment: [
        [23.73, 92.71], [23.70, 92.74], [23.66, 92.78]
      ]
    }
  }
];

// 8 Official Indian NER States Metadata
const NER_STATES = [
  { name: "Sikkim", capital: "Gangtok", center: [27.33, 88.61], sensors: 6, risk: "CRITICAL" },
  { name: "Assam", capital: "Dispur", center: [26.14, 91.73], sensors: 10, risk: "HIGH" },
  { name: "Meghalaya", capital: "Shillong", center: [25.57, 91.88], sensors: 6, risk: "HIGH" },
  { name: "Arunachal Pradesh", capital: "Itanagar", center: [27.08, 93.60], sensors: 5, risk: "MODERATE" },
  { name: "Nagaland", capital: "Kohima", center: [25.67, 94.10], sensors: 4, risk: "HIGH" },
  { name: "Manipur", capital: "Imphal", center: [24.81, 93.93], sensors: 3, risk: "MODERATE" },
  { name: "Mizoram", capital: "Aizawl", center: [23.73, 92.71], sensors: 4, risk: "CRITICAL" },
  { name: "Tripura", capital: "Agartala", center: [23.83, 91.28], sensors: 2, risk: "LOW" },
];

// 3D Mountain Slope Physics Component for Three.js
function SimulationMountain({ stage, scenario }: { stage: SimStage; scenario: ScenarioPreset }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const debrisRef = useRef<THREE.Points>(null);

  // Dynamic deformation & color gradient based on disaster stage
  const { geometry, colors } = useMemo(() => {
    const size = 30;
    const segments = 60;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const count = pos.count;
    const colorArray = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Procedural Mountain Ridge
      let y = Math.sin(x * 0.18) * Math.cos(z * 0.18) * 4.5;
      y += Math.cos(x * 0.35 + 0.5) * 2.0;
      y += Math.sin(z * 0.4) * 1.5;

      // Create a steep mountain escarpment slope
      const slopeFactor = (z + 15) * 0.25;
      y += slopeFactor;

      // Apply Stage Failure Displacement
      if (stage >= 3 && Math.abs(x) < 7 && z > -5 && z < 8) {
        const failureDrop = (stage - 2) * 1.6;
        y -= failureDrop * (1 - Math.abs(x) / 7);
      }

      pos.setY(i, y);

      // Color mapping: Topography + Saturation Glow
      let r = 0.15, g = 0.35, b = 0.22; // Natural mountain green

      if (stage === 2) {
        // Pore water saturation (cyan / blue tint in saturation zone)
        if (Math.abs(x) < 8 && z > -6 && z < 9) {
          r = 0.1; g = 0.45; b = 0.7;
        }
      } else if (stage === 3) {
        // Geotechnical Shear stress (yellow / amber fault line)
        if (Math.abs(x) < 8 && z > -6 && z < 9) {
          r = 0.85; g = 0.65; b = 0.1;
        }
      } else if (stage >= 4) {
        // Mass shear failure & exposed bedrock (crimson / dark red scar)
        if (Math.abs(x) < 8 && z > -6 && z < 9) {
          r = 0.9; g = 0.18; b = 0.18;
        }
      }

      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    return { geometry: geo, colors: colorArray };
  }, [stage]);

  // Particle debris flow animation
  const particleCount = 180;
  const [particleGeo] = useState(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = 6 + Math.random() * 3;
      positions[i * 3 + 2] = -4 + (Math.random() - 0.5) * 6;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  });

  useFrame((state, delta) => {
    if (stage >= 4 && debrisRef.current) {
      const positions = debrisRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        // Slide particles downwards along the slope
        positions[i * 3 + 1] -= delta * 6.5; // down Y
        positions[i * 3 + 2] += delta * 7.5; // forward Z
        // Reset when reaching valley floor
        if (positions[i * 3 + 1] < -1 || positions[i * 3 + 2] > 12) {
          positions[i * 3] = (Math.random() - 0.5) * 9;
          positions[i * 3 + 1] = 6 + Math.random() * 2;
          positions[i * 3 + 2] = -3 + (Math.random() - 0.5) * 4;
        }
      }
      debrisRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Mountain Slope Mesh */}
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.75}
          metalness={0.15}
          flatShading={false}
          wireframe={false}
        />
      </mesh>

      {/* Road Highway Section Cut into Mountain */}
      <mesh position={[0, 0.3, 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 1.8]} />
        <meshStandardMaterial 
          color={stage >= 4 ? "#ef4444" : "#334155"} 
          roughness={0.8}
        />
      </mesh>

      {/* Active In-Situ Sensor Nodes on 3D Slope */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh position={[0, 4.8, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 1.2, 16]} />
          <meshStandardMaterial 
            color={stage >= 3 ? "#ef4444" : stage === 2 ? "#f97316" : "#10b981"} 
            emissive={stage >= 3 ? "#ef4444" : stage === 2 ? "#f97316" : "#10b981"}
            emissiveIntensity={0.6}
          />
        </mesh>
      </Float>

      {/* Debris Particles on Failure */}
      {stage >= 4 && (
        <points ref={debrisRef} geometry={particleGeo}>
          <pointsMaterial
            size={0.4}
            color="#b45309"
            transparent
            opacity={0.85}
          />
        </points>
      )}

      {/* Rain Particle Field during Cloudburst */}
      {stage >= 1 && (
        <Sparkles 
          count={120} 
          scale={[28, 14, 28]} 
          size={2.5} 
          speed={3.5} 
          color="#60a5fa" 
          opacity={0.65} 
        />
      )}
    </group>
  );
}

export const NERSimulationPage: React.FC = () => {
  const { sensors } = useLiveTelemetry(API_BASE_URL, 15000);
  const [activeScenario, setActiveScenario] = useState<ScenarioPreset>(NER_SCENARIOS[0]);
  const [stage, setStage] = useState<SimStage>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [viewLayout, setViewLayout] = useState<"dual" | "3d-only" | "2d-only">("dual");
  const [isExecutiveMode, setIsExecutiveMode] = useState<boolean>(false);
  const [basemap, setBasemap] = useState<"dark" | "satellite" | "topo">("dark");
  const [smsSent, setSmsSent] = useState<boolean>(false);

  // Auto-play timer for presentation flow
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setStage(prev => {
          if (prev >= 5) {
            setIsPlaying(false);
            return 5;
          }
          return (prev + 1) as SimStage;
        });
      }, 4500 / playbackSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed]);

  // Handle stage trigger side-effects
  useEffect(() => {
    if (stage === 5) {
      setSmsSent(true);
    } else {
      setSmsSent(false);
    }
  }, [stage]);

  // Current stage technical metrics
  const stageData = useMemo(() => {
    switch (stage) {
      case 1:
        return {
          title: "Stage 1: Monsoonal Cloudburst Surge",
          sub: "Extreme Orographic Rainfall Inflow",
          icon: CloudRain,
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-500/10 border-blue-500/20",
          rainMm: activeScenario.triggerRainfall,
          soilMoisture: 36.2,
          porePressure: 28.5,
          tiltAngle: 0.02,
          factorOfSafety: activeScenario.initialFoS,
          riskLevel: "MODERATE",
          badgeColor: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
          narration: `Automated IMD & INSAT-3D Doppler radar detects severe convective precipitation exceeding ${activeScenario.triggerRainfall} mm/24h over ${activeScenario.location}. In-situ rain gauges trigger initial advisory mode.`
        };
      case 2:
        return {
          title: "Stage 2: Geotechnical Subsurface Saturation",
          sub: "Hydrostatic Pore-Water Pressure Build-up",
          icon: Droplets,
          color: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-500/10 border-amber-500/20",
          rainMm: activeScenario.triggerRainfall + 40,
          soilMoisture: 58.7,
          porePressure: 74.2,
          tiltAngle: 0.05,
          factorOfSafety: 1.18,
          riskLevel: "HIGH ORANGE",
          badgeColor: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30",
          narration: `Piezometers installed at 8m depth register a critical hydraulic head surge (74.2 kPa). Soil matrix loses effective cohesion (shear strength drops). Multi-tier AI raises warning level to ORANGE.`
        };
      case 3:
        return {
          title: "Stage 3: Geotechnical Shear Failure & Creep",
          sub: "Subsurface Angular Displacement Alarm",
          icon: Activity,
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-500/10 border-orange-500/20",
          rainMm: activeScenario.triggerRainfall + 65,
          soilMoisture: 68.4,
          porePressure: 98.6,
          tiltAngle: 0.16,
          factorOfSafety: 0.92,
          riskLevel: "CRITICAL RED (IMMINENT)",
          badgeColor: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
          narration: `MEMS Inclinometers record accelerated shear strain velocity exceeding 0.16°/hr. Factor of Safety drops below 1.0 (FoS = 0.92). Structural collapse of the mountain slope is mathematically imminent.`
        };
      case 4:
        return {
          title: "Stage 4: Slope Shear Collapse & Debris Runout",
          sub: "Infrastructure Corridor Blockage",
          icon: ShieldAlert,
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-500/10 border-red-500/20",
          rainMm: activeScenario.triggerRainfall + 80,
          soilMoisture: 72.1,
          porePressure: 114.0,
          tiltAngle: 0.42,
          factorOfSafety: 0.68,
          riskLevel: "DISASTER IN PROGRESS",
          badgeColor: "bg-red-600 text-white border-red-600 animate-pulse",
          narration: `Mass slope failure occurs. Thousands of tons of colluvium and boulders slide down the slope, cutting off ${activeScenario.criticalCorridor}. Transit is completely severed.`
        };
      case 5:
        return {
          title: "Stage 5: Autonomous Warning & Safe Bypass Detour",
          sub: "Multi-Agency Alert Dispatch & Evacuation",
          icon: Navigation,
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-500/10 border-emerald-500/20",
          rainMm: activeScenario.triggerRainfall + 80,
          soilMoisture: 72.1,
          porePressure: 114.0,
          tiltAngle: 0.42,
          factorOfSafety: 0.68,
          riskLevel: "EVACUATION & ROUTE DETOUR ACTIVE",
          badgeColor: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          narration: `System initiates automated Common Alerting Protocol (CAP): Geo-targeted SMS alerts dispatched to ${activeScenario.affectedPopulation}. AI Dijkstra solver instantly computes ${activeScenario.detourRoute.name} to preserve supply lifelines.`
        };
      default:
        return null;
    }
  }, [stage, activeScenario]);

  return (
    <div className={`p-4 mx-auto max-w-[1700px] flex flex-col gap-4 font-sans animate-fadeIn text-textPrimary ${isExecutiveMode ? 'fixed inset-0 z-50 bg-bgPrimary p-6 overflow-y-auto max-w-none' : ''}`}>
      
      {/* ── TOP EXECUTIVE BANNER ── */}
      <header className="bg-bgCard border border-borderColor rounded-3xl p-5 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/25 shrink-0">
            <Mountain className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-textPrimary tracking-tight">
                Indian NER Strategic Geo-AI Simulation & 3D Landslide Twin
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Official Multi-Hazard Grid
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                48h Lead Warning
              </span>
            </div>
            <p className="text-xs font-semibold text-textSecondary">
              High-Precision Physics-Informed Geotechnical Simulation & Real-time Regional Emergency Detour Routing
            </p>
          </div>
        </div>

        {/* Executive KPI Stats for Panel */}
        <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto justify-start lg:justify-end">
          <div className="px-3.5 py-2 bg-bgPrimary border border-borderColor rounded-xl text-center">
            <div className="text-[9px] font-black text-textMuted uppercase tracking-wider">AI ROC-AUC</div>
            <div className="text-sm font-black text-blue-600 dark:text-blue-400">94.2%</div>
          </div>
          <div className="px-3.5 py-2 bg-bgPrimary border border-borderColor rounded-xl text-center">
            <div className="text-[9px] font-black text-textMuted uppercase tracking-wider">Lead Time</div>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">48 Hours</div>
          </div>
          <div className="px-3.5 py-2 bg-bgPrimary border border-borderColor rounded-xl text-center">
            <div className="text-[9px] font-black text-textMuted uppercase tracking-wider">NER States</div>
            <div className="text-sm font-black text-textPrimary">8 States (40 Nodes)</div>
          </div>

          <button
            onClick={() => setIsExecutiveMode(!isExecutiveMode)}
            className="p-2.5 bg-bgPrimary hover:bg-bgCard border border-borderColor text-textPrimary rounded-xl transition shadow-sm"
            title={isExecutiveMode ? "Exit Presentation Mode" : "Enter Executive Panel Mode"}
          >
            {isExecutiveMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── SCENARIO SELECTOR & STAGE CONTROLLER BAR ── */}
      <div className="bg-bgCard border border-borderColor rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Scenario Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-black uppercase text-textMuted shrink-0">Scenario:</span>
          {NER_SCENARIOS.map(sc => (
            <button
              key={sc.id}
              onClick={() => {
                setActiveScenario(sc);
                setStage(1);
                setIsPlaying(false);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeScenario.id === sc.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black'
                  : 'bg-bgPrimary text-textSecondary hover:text-textPrimary border border-borderColor'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {sc.name} ({sc.state})
            </button>
          ))}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center bg-bgPrimary border border-borderColor rounded-xl p-1 gap-1">
            <button
              onClick={() => setStage(prev => (prev > 1 ? (prev - 1) as SimStage : 1))}
              disabled={stage === 1}
              className="p-1.5 rounded-lg text-textSecondary hover:text-textPrimary disabled:opacity-40 transition"
              title="Previous Stage"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                isPlaying 
                  ? 'bg-amber-600 text-white shadow-sm' 
                  : 'bg-blue-600 text-white shadow-sm'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause' : 'Simulate Flow'}
            </button>
            <button
              onClick={() => setStage(prev => (prev < 5 ? (prev + 1) as SimStage : 5))}
              disabled={stage === 5}
              className="p-1.5 rounded-lg text-textSecondary hover:text-textPrimary disabled:opacity-40 transition"
              title="Next Stage"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setStage(1);
                setIsPlaying(false);
              }}
              className="p-1.5 rounded-lg text-textSecondary hover:text-textPrimary transition"
              title="Reset Simulation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* View Layout Toggle */}
          <div className="flex items-center bg-bgPrimary border border-borderColor rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewLayout("dual")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                viewLayout === "dual" ? 'bg-blue-600 text-white' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Dual 3D+2D
            </button>
            <button
              onClick={() => setViewLayout("3d-only")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                viewLayout === "3d-only" ? 'bg-blue-600 text-white' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              3D Slope
            </button>
            <button
              onClick={() => setViewLayout("2d-only")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                viewLayout === "2d-only" ? 'bg-blue-600 text-white' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              2D Geo-Map
            </button>
          </div>
        </div>
      </div>

      {/* ── 5-STAGE DISASTER PROGRESSION STEPPER ── */}
      <div className="bg-bgCard border border-borderColor rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {[
            { st: 1, name: "1. Rain Cloudburst", icon: CloudRain },
            { st: 2, name: "2. Pore Saturation", icon: Droplets },
            { st: 3, name: "3. Shear Tilt Alarm", icon: Activity },
            { st: 4, name: "4. Slope Collapse", icon: ShieldAlert },
            { st: 5, name: "5. Automated Detour", icon: Navigation },
          ].map(item => (
            <button
              key={item.st}
              onClick={() => {
                setStage(item.st as SimStage);
                setIsPlaying(false);
              }}
              className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                stage === item.st
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 font-black'
                  : stage > item.st
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-bgPrimary text-textMuted border-borderColor hover:text-textPrimary'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <div className="text-xs font-bold leading-tight truncate">
                {item.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── LIVE STAGE TECHNICAL NARRATION & METRICS CARD ── */}
      {stageData && (
        <div className={`p-5 rounded-2xl border ${stageData.bgColor} shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all duration-300`}>
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-xl bg-bgCard border border-borderColor shadow-sm ${stageData.color}`}>
              <stageData.icon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-textPrimary">
                  {stageData.title}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${stageData.badgeColor}`}>
                  {stageData.riskLevel}
                </span>
              </div>
              <p className="text-xs font-semibold text-textSecondary mt-1 max-w-4xl leading-relaxed">
                {stageData.narration}
              </p>
            </div>
          </div>

          {/* Telemetry Gauge Readouts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto shrink-0">
            <div className="p-2.5 bg-bgCard border border-borderColor rounded-xl text-center">
              <div className="text-[9px] font-black text-textMuted uppercase">24h Rain</div>
              <div className="text-xs font-black text-blue-600 dark:text-blue-400">{stageData.rainMm} mm</div>
            </div>
            <div className="p-2.5 bg-bgCard border border-borderColor rounded-xl text-center">
              <div className="text-[9px] font-black text-textMuted uppercase">Soil VWC</div>
              <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">{stageData.soilMoisture}%</div>
            </div>
            <div className="p-2.5 bg-bgCard border border-borderColor rounded-xl text-center">
              <div className="text-[9px] font-black text-textMuted uppercase">Pore Press.</div>
              <div className="text-xs font-black text-amber-600 dark:text-amber-400">{stageData.porePressure} kPa</div>
            </div>
            <div className="p-2.5 bg-bgCard border border-borderColor rounded-xl text-center">
              <div className="text-[9px] font-black text-textMuted uppercase">Factor of Safety</div>
              <div className={`text-xs font-black ${stageData.factorOfSafety < 1.0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {stageData.factorOfSafety.toFixed(2)} {stageData.factorOfSafety < 1.0 ? '⚠️' : '✓'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN INTERACTIVE DISPLAY AREA (DUAL / 3D / 2D) ── */}
      <div className={`grid gap-4 ${viewLayout === 'dual' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* 3D MOUNTAIN SLOPE PHYSICS CANVAS */}
        {(viewLayout === 'dual' || viewLayout === '3d-only') && (
          <div className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-xl flex flex-col relative h-[540px] overflow-hidden">
            <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
              <span className="px-3 py-1 bg-bgCard/90 border border-borderColor backdrop-blur-md rounded-xl text-[10px] font-black uppercase text-textPrimary shadow-sm flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-blue-600" />
                3D Digital Slope Physics Twin
              </span>
              <span className="px-2.5 py-1 bg-bgCard/90 border border-borderColor backdrop-blur-md rounded-xl text-[9px] font-bold text-textSecondary shadow-sm">
                Orbit / Pan / Zoom Enabled
              </span>
            </div>

            <div className="w-full h-full rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
              <Canvas camera={{ position: [0, 14, 22], fov: 45 }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[15, 25, 15]} intensity={1.5} castShadow />
                <pointLight position={[-10, 10, -10]} intensity={0.5} />
                <SimulationMountain stage={stage} scenario={activeScenario} />
                <OrbitControls 
                  enablePan={true} 
                  enableZoom={true} 
                  enableRotate={true}
                  maxPolarAngle={Math.PI / 2.05}
                  minDistance={8}
                  maxDistance={45}
                />
              </Canvas>
            </div>
          </div>
        )}

        {/* 2D OFFICIAL INDIAN NER STRATEGIC COMMAND MAP */}
        {(viewLayout === 'dual' || viewLayout === '2d-only') && (
          <div className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-xl flex flex-col relative h-[540px] overflow-hidden">
            {/* Map Top Floating Controls */}
            <div className="absolute top-6 left-6 z-[1000] flex items-center gap-2">
              <span className="px-3 py-1 bg-bgCard/90 border border-borderColor backdrop-blur-md rounded-xl text-[10px] font-black uppercase text-textPrimary shadow-sm flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                Indian NER Strategic Geo-Grid
              </span>
              
              {/* Basemap Switcher */}
              <div className="flex items-center bg-bgCard/90 border border-borderColor backdrop-blur-md rounded-xl p-0.5 shadow-sm">
                <button
                  onClick={() => setBasemap("dark")}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase transition ${
                    basemap === "dark" ? "bg-blue-600 text-white" : "text-textSecondary hover:text-textPrimary"
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setBasemap("satellite")}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase transition ${
                    basemap === "satellite" ? "bg-blue-600 text-white" : "text-textSecondary hover:text-textPrimary"
                  }`}
                >
                  Satellite
                </button>
                <button
                  onClick={() => setBasemap("topo")}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase transition ${
                    basemap === "topo" ? "bg-blue-600 text-white" : "text-textSecondary hover:text-textPrimary"
                  }`}
                >
                  Topo
                </button>
              </div>
            </div>

            {/* Leaflet Map with Zero-Key Watermark-Free Tiles */}
            <div className="w-full h-full rounded-2xl overflow-hidden relative">
              <MapContainer
                center={activeScenario.coordinates}
                zoom={activeScenario.zoom}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                {basemap === "dark" && (
                  <TileLayer
                    attribution='&copy; Esri &mdash; Dark Canvas'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={16}
                  />
                )}
                {basemap === "satellite" && (
                  <TileLayer
                    attribution='&copy; Esri World Imagery'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={18}
                  />
                )}
                {basemap === "topo" && (
                  <TileLayer
                    attribution='&copy; Esri World Topo Map'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={18}
                  />
                )}

                {/* Radar Precipitation Overlay during Stage 1-4 */}
                {stage >= 1 && (
                  <WMSTileLayer
                    url="https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi"
                    layers="nexrad-n0r-900913"
                    format="image/png"
                    transparent={true}
                    opacity={stage === 1 ? 0.35 : 0.65}
                    attribution="Weather Radar Overlay"
                  />
                )}

                {/* Blocked Road Segment (Highlighted in Stage 4 & 5) */}
                {stage >= 4 && (
                  <Polyline
                    positions={activeScenario.detourRoute.blockedSegment}
                    pathOptions={{
                      color: "#EF4444",
                      weight: 7,
                      opacity: 0.95,
                      dashArray: "8, 8"
                    }}
                  >
                    <Popup>
                      <div className="p-1 bg-bgCard text-textPrimary text-xs font-bold">
                        <span className="text-red-600 block uppercase text-[10px]">⚠️ ROAD SEVERED / COLLAPSED</span>
                        {activeScenario.criticalCorridor}
                      </div>
                    </Popup>
                  </Polyline>
                )}

                {/* Alternate Safe Evacuation Detour Route (Stage 5) */}
                {stage === 5 && (
                  <>
                    <Polyline
                      positions={activeScenario.detourRoute.waypoints}
                      pathOptions={{
                        color: "#10B981",
                        weight: 7,
                        opacity: 0.95
                      }}
                    >
                      <Popup>
                        <div className="p-1 bg-bgCard text-textPrimary text-xs font-bold">
                          <span className="text-emerald-600 block uppercase text-[10px]">✓ SAFE EMERGENCY BYPASS</span>
                          {activeScenario.detourRoute.name}
                        </div>
                      </Popup>
                    </Polyline>

                    <Marker position={activeScenario.detourRoute.waypoints[0]} icon={greenMarkerIcon}>
                      <Popup>
                        <div className="p-1 bg-bgCard text-textPrimary text-xs font-bold">
                          Origin Evacuation Hub
                        </div>
                      </Popup>
                    </Marker>

                    <Marker position={activeScenario.detourRoute.waypoints[activeScenario.detourRoute.waypoints.length - 1]} icon={redMarkerIcon}>
                      <Popup>
                        <div className="p-1 bg-bgCard text-textPrimary text-xs font-bold">
                          Safe Destination Haven
                        </div>
                      </Popup>
                    </Marker>
                  </>
                )}

                {/* Scenario Epicenter Circle */}
                <CircleMarker
                  center={activeScenario.coordinates}
                  radius={stage >= 3 ? 22 : 14}
                  className={stage >= 3 ? "halo-red" : "halo-yellow"}
                  pathOptions={{
                    fillColor: stage >= 4 ? "#EF4444" : stage === 3 ? "#F97316" : "#F59E0B",
                    fillOpacity: 0.35,
                    stroke: true,
                    color: "#FFFFFF",
                    weight: 2
                  }}
                >
                  <Popup>
                    <div className="p-1.5 font-sans bg-bgCard text-textPrimary leading-snug rounded-lg">
                      <span className="text-[10px] font-black uppercase text-blue-600 block">
                        Simulated Disaster Epicenter
                      </span>
                      <strong className="text-xs">{activeScenario.name}</strong>
                      <p className="text-[10px] text-textSecondary mt-1">
                        Geology: {activeScenario.geology}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>

                {/* 8 Official NER State HQ Nodes */}
                {NER_STATES.map((st, idx) => (
                  <CircleMarker
                    key={idx}
                    center={st.center as [number, number]}
                    radius={6}
                    pathOptions={{
                      color: "#FFFFFF",
                      fillColor: st.risk === "CRITICAL" ? "#EF4444" : st.risk === "HIGH" ? "#F97316" : "#10B981",
                      fillOpacity: 0.9,
                      weight: 1.5
                    }}
                  >
                    <Popup>
                      <div className="p-1.5 font-sans bg-bgCard text-textPrimary text-xs leading-snug rounded-lg">
                        <strong className="block text-textPrimary">{st.name} State Command</strong>
                        <p className="text-[10px] text-textSecondary mt-0.5">Capital: {st.capital}</p>
                        <p className="text-[10px] text-blue-600 font-bold mt-0.5">Active Telemetry: {st.sensors} In-Situ Nodes</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM EXECUTIVE PRESENTATION PANELS (UNCLUTTERED 3-CARD GRID) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Official Indian NER States Telemetry Grid */}
        <div className="bg-bgCard border border-borderColor rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-borderColor pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-textPrimary flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" /> NER States Grid Coverage
            </h4>
            <span className="text-[10px] font-bold text-textMuted">8 States • 40 Nodes</span>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {NER_STATES.map((st, idx) => (
              <div key={idx} className="p-2.5 bg-bgPrimary border border-borderColor rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-textPrimary">{st.name}</div>
                  <div className="text-[10px] font-semibold text-textMuted">{st.sensors} Nodes</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                  st.risk === 'CRITICAL' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                  st.risk === 'HIGH' ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' :
                  'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                }`}>
                  {st.risk}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: AI Multi-Tier Inference Pipeline */}
        <div className="bg-bgCard border border-borderColor rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-borderColor pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-textPrimary flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" /> Multi-Tier AI Calibration
            </h4>
            <span className="text-[10px] font-bold text-emerald-600 font-mono">AUROC 0.942</span>
          </div>
          <div className="space-y-2 text-xs font-semibold text-textSecondary">
            <div className="flex items-center justify-between p-2 bg-bgPrimary border border-borderColor rounded-xl">
              <span>Tier-1 Spatial Susceptibility (30m DEM)</span>
              <strong className="text-blue-600">0.889 AUC</strong>
            </div>
            <div className="flex items-center justify-between p-2 bg-bgPrimary border border-borderColor rounded-xl">
              <span>Tier-2 Dynamic Hydro-Trigger Model</span>
              <strong className="text-emerald-600">0.912 AUC</strong>
            </div>
            <div className="flex items-center justify-between p-2 bg-bgPrimary border border-borderColor rounded-xl">
              <span>Meta-Calibrator Calibrated Precision</span>
              <strong className="text-purple-600">75.95%</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Automated Broadcast & SMS Evacuation Engine */}
        <div className="bg-bgCard border border-borderColor rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-borderColor pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-textPrimary flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-600" /> Emergency CAP/SMS Broadcast
            </h4>
            <span className="text-[10px] font-bold text-textMuted">NDMA / SDMA Engine</span>
          </div>

          <div className="p-3 bg-bgPrimary border border-borderColor rounded-xl text-xs font-medium space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-textPrimary">Citizen Alert Dispatch:</span>
              <span className={`font-black uppercase text-[10px] ${smsSent ? 'text-emerald-600' : 'text-amber-600'}`}>
                {smsSent ? 'DISPATCHED (LIVE)' : 'STANDBY ARMED'}
              </span>
            </div>
            <div className="p-2 rounded bg-bgCard border border-borderColor/80 text-[11px] font-mono text-textPrimary leading-relaxed">
              {smsSent 
                ? `[ALERT NDMA-NER]: Severe landslide confirmed at ${activeScenario.location}. ${activeScenario.criticalCorridor} BLOCKED. Detour via ${activeScenario.detourRoute.name}. Evacuate slope perimeters immediately.`
                : `[SYSTEM ARMED]: Monitoring in-situ sensors. Automated SMS broadcast triggers automatically upon Tier-3 shear displacement.`}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
