import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Sky, Sparkles, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { SensorNodeData } from '../hooks/useLiveTelemetry';
import { ShieldAlert, Activity, Droplets, Gauge, Compass, Eye, Info } from 'lucide-react';

export type TerrainViewMode = 'satellite' | 'heatmap' | 'lidar';
export type WeatherMode = 'clear' | 'overcast' | 'monsoon';
export type CameraPreset = 'cinematic' | 'topdown' | 'cross_section' | 'focus';

interface Terrain3DProps {
  sensors: SensorNodeData[];
  viewMode: TerrainViewMode;
  weatherMode: WeatherMode;
  selectedSensorId: string | null;
  onSelectSensor: (sensor: SensorNodeData | null) => void;
  autoRotate: boolean;
  cameraPreset: CameraPreset;
  highlightHighestRisk?: boolean;
}

// ── Perlin / Simplex style fractal noise generator for realistic mountain topography ──
function pseudoNoise2D(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, z: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const fx = x - i;
  const fz = z - j;

  // Smoothstep interpolation
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);

  const s00 = pseudoNoise2D(i, j);
  const s10 = pseudoNoise2D(i + 1, j);
  const s01 = pseudoNoise2D(i, j + 1);
  const s11 = pseudoNoise2D(i + 1, j + 1);

  const x0 = s00 * (1 - u) + s10 * u;
  const x1 = s01 * (1 - u) + s11 * u;

  return x0 * (1 - v) + x1 * v;
}

// Multi-octave fractal mountain generator
export function getTerrainHeight(x: number, z: number): number {
  const nx = x * 0.04;
  const nz = z * 0.04;

  // Layer 1: Broad mountain masses & central ridge
  let h = Math.sin(nx * 0.8) * Math.cos(nz * 0.7) * 7.5;
  h += Math.sin(nx * 0.4 + 1.2) * 5.0;

  // Layer 2: Medium mountain ridges
  h += smoothNoise(nx * 2.5, nz * 2.5) * 4.5;

  // Layer 3: High-frequency crags & scree
  h += smoothNoise(nx * 6.0, nz * 6.0) * 1.8;

  // Layer 4: Ravine & river valley incision
  const riverValley = Math.abs(Math.sin(nx * 0.6 + nz * 0.4));
  if (riverValley < 0.35) {
    h -= (0.35 - riverValley) * 8.0;
  }

  // Edge falloff to create an island / valley plateau mass
  const distFromCenter = Math.sqrt(x * x + z * z);
  const edgeFactor = Math.max(0, 1 - Math.pow(distFromCenter / 65, 2.5));

  return Math.max(-2, h * edgeFactor);
}

// Compute hazard risk level for a sensor
export function computeRiskMetrics(sensor: SensorNodeData) {
  const SM = sensor.soil_moisture;
  const rain = sensor.rain_24h_obs;
  const api = sensor.api_7d;
  const pore = Math.min(120, SM * 0.95);
  const incl = Math.min(0.15, (pore * 0.0006) + (rain * 0.0003));
  const tVal = 0.018 * rain + 0.005 * api + 0.022 * pore + 20.0 * incl - 1.95;
  const prob = 1 / (1 + Math.exp(-tVal));

  let level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'SAFE' = 'SAFE';
  let color = '#10b981'; // green
  let glowColor = 'rgba(16, 185, 129, 0.4)';

  if (prob >= 0.75) {
    level = 'CRITICAL';
    color = '#ef4444'; // red
    glowColor = 'rgba(239, 68, 68, 0.9)';
  } else if (prob >= 0.45) {
    level = 'HIGH';
    color = '#f97316'; // orange
    glowColor = 'rgba(249, 115, 22, 0.8)';
  } else if (prob >= 0.18) {
    level = 'MODERATE';
    color = '#eab308'; // yellow
    glowColor = 'rgba(234, 179, 8, 0.7)';
  }

  return { prob, level, color, glowColor, pore, incl };
}

// Map real geo lat/lon to 3D terrain space bounds (-45 to 45)
export function geoToTerrainCoords(lat: number, lon: number): [number, number, number] {
  const latMin = 22.5, latMax = 28.5;
  const lonMin = 89.5, lonMax = 96.5;

  const nx = ((lon - lonMin) / (lonMax - lonMin)) * 80 - 40;
  const nz = -(((lat - latMin) / (latMax - latMin)) * 80 - 40);

  // Clamp within terrain footprint
  const x = Math.max(-42, Math.min(42, nx));
  const z = Math.max(-42, Math.min(42, nz));
  const y = getTerrainHeight(x, z);

  return [x, y, z];
}

// ── Terrain Mesh with Dynamic Topographic Shader / Vertex Coloring ──
const TerrainMesh: React.FC<{
  viewMode: TerrainViewMode;
  sensors: SensorNodeData[];
}> = ({ viewMode, sensors }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Precompute sensor risk hot spots for heatmap blending
  const sensorHotspots = useMemo(() => {
    return sensors.map(s => {
      const [x, y, z] = geoToTerrainCoords(s.latitude, s.longitude);
      const { prob } = computeRiskMetrics(s);
      return { x, y, z, prob };
    });
  }, [sensors]);

  const { geometry, colors } = useMemo(() => {
    const size = 110;
    const segments = 110;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const vertexCount = pos.count;
    const colorArray = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getTerrainHeight(x, z);
      pos.setY(i, y);

      // Default Color: Photogrammetry Topographic Colors
      let r = 0.12, g = 0.22, b = 0.16; // valley green-slate

      if (viewMode === 'satellite') {
        if (y < 0.5) {
          // River basin / low valley
          r = 0.08; g = 0.18; b = 0.14;
        } else if (y < 4.0) {
          // Lush forest slope
          const t = (y - 0.5) / 3.5;
          r = 0.10 + t * 0.10;
          g = 0.24 + t * 0.05;
          b = 0.16 + t * 0.04;
        } else if (y < 9.0) {
          // Rocky crags & alpine scree
          const t = (y - 4.0) / 5.0;
          r = 0.28 + t * 0.18;
          g = 0.32 + t * 0.14;
          b = 0.35 + t * 0.18;
        } else {
          // High peak snow-cap / quartzite ridge
          const t = Math.min(1, (y - 9.0) / 4.0);
          r = 0.65 + t * 0.28;
          g = 0.70 + t * 0.25;
          b = 0.78 + t * 0.20;
        }
      } else if (viewMode === 'heatmap') {
        // AI Risk Thermal Heatmap Mode: Inverse Distance Weighting from sensor threat levels
        let totalThreat = 0.05;
        let totalWeight = 0.01;

        for (const s of sensorHotspots) {
          const dx = x - s.x;
          const dz = z - s.z;
          const distSq = dx * dx + dz * dz;
          const weight = Math.exp(-distSq / 90); // Gaussian radius falloff
          totalThreat += s.prob * weight;
          totalWeight += weight;
        }

        const riskValue = Math.min(1.0, totalThreat / Math.max(1, totalWeight * 0.8));

        if (riskValue < 0.25) {
          // Cool emerald / slate
          r = 0.06; g = 0.35; b = 0.24;
        } else if (riskValue < 0.55) {
          // Amber / Gold warning
          const t = (riskValue - 0.25) / 0.30;
          r = 0.1 + t * 0.85;
          g = 0.4 + t * 0.35;
          b = 0.2 - t * 0.18;
        } else {
          // Intense Crimson hazard
          const t = (riskValue - 0.55) / 0.45;
          r = 0.95;
          g = 0.75 - t * 0.65;
          b = 0.05;
        }
      } else {
        // Tactical LiDAR Wireframe Mode
        const contourLine = Math.abs(Math.sin(y * 1.5)) > 0.85 ? 0.9 : 0.15;
        r = 0.04 + contourLine * 0.15;
        g = 0.08 + contourLine * 0.75;
        b = 0.18 + contourLine * 0.82;
      }

      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    return { geometry: geo, colors: colorArray };
  }, [viewMode, sensorHotspots]);

  return (
    <group>
      {/* Primary Topographic Surface */}
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        {viewMode === 'lidar' ? (
          <meshStandardMaterial
            vertexColors
            wireframe={true}
            roughness={0.4}
            metalness={0.8}
            emissive="#00e5ff"
            emissiveIntensity={0.25}
          />
        ) : (
          <meshStandardMaterial
            vertexColors
            roughness={0.82}
            metalness={0.12}
            flatShading={false}
          />
        )}
      </mesh>

      {/* River Basin / Valley Waterbed Plane */}
      {viewMode !== 'lidar' && (
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[115, 115]} />
          <meshStandardMaterial
            color="#082f49"
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* Futuristic Pedestal Base / Bounding Box */}
      <mesh position={[0, -4.5, 0]}>
        <boxGeometry args={[112, 6, 112]} />
        <meshStandardMaterial
          color="#090d16"
          roughness={0.9}
          metalness={0.6}
        />
      </mesh>
    </group>
  );
};

// ── Interactive Sensor Hologram Beacon ──
const SensorBeacon: React.FC<{
  sensor: SensorNodeData;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ sensor, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const [x, y, z] = useMemo(() => geoToTerrainCoords(sensor.latitude, sensor.longitude), [sensor]);
  const { prob, level, color, glowColor, pore, incl } = useMemo(() => computeRiskMetrics(sensor), [sensor]);

  const ringRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.5;
      const scale = 1 + Math.sin(t * 3 + x) * 0.15;
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Ground Hazard Radial Ring */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.08, 0]}
      >
        <ringGeometry args={[isSelected ? 2.5 : 1.2, isSelected ? 3.2 : 1.8, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.85 : prob > 0.4 ? 0.65 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Holographic Vertical Laser Column */}
      <mesh
        ref={beamRef}
        position={[0, 5, 0]}
      >
        <cylinderGeometry args={[0.08, 0.25, 10, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.75 : prob > 0.5 ? 0.55 : 0.25}
        />
      </mesh>

      {/* Beacon Floating Gem / Pin */}
      <Float speed={2.5} rotationIntensity={0.8} floatIntensity={0.6}>
        <group
          position={[0, 3.2, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
        >
          {/* Outer Pulsing Aura */}
          <mesh>
            <octahedronGeometry args={[isSelected ? 1.4 : 0.9, 0]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isSelected ? 2.0 : hovered ? 1.5 : 0.8}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>

          {/* Core Energy Sphere */}
          <mesh>
            <sphereGeometry args={[isSelected ? 0.6 : 0.4, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      </Float>

      {/* 3D Interactive HTML Overlay Card - only show on active hover or selection to avoid clutter */}
      {(hovered || isSelected) && (
        <Html
          position={[0, 7.5, 0]}
          center
          distanceFactor={40}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`cursor-pointer select-none transition-all duration-300 backdrop-blur-xl border rounded-2xl shadow-2xl p-3 min-w-[210px] ${
              isSelected
                ? 'bg-slate-900/95 border-blue-400 ring-2 ring-blue-500/50 scale-105'
                : 'bg-slate-950/85 border-slate-700/80 hover:scale-105'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full animate-ping shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-extrabold text-xs text-white tracking-tight truncate">
                  {sensor.name}
                </span>
              </div>
              <span
                className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shrink-0"
                style={{
                  backgroundColor: `${color}20`,
                  color: color,
                  border: `1px solid ${color}40`,
                }}
              >
                {level}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 font-semibold mb-2">
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                <div className="text-[8px] text-slate-400 uppercase font-black">Failure Threat</div>
                <div className="text-xs font-mono font-black text-white">
                  {(prob * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                <div className="text-[8px] text-slate-400 uppercase font-black">24h Rain</div>
                <div className="text-xs font-mono font-black text-blue-400">
                  {sensor.rain_24h_obs.toFixed(1)} mm
                </div>
              </div>
            </div>

            {/* Telemetry Chips */}
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-white/5">
              <span>SM: {sensor.soil_moisture.toFixed(0)}%</span>
              <span>Pore: {pore.toFixed(0)} kPa</span>
              <span>Tilt: {(incl * 100).toFixed(1)}°</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// ── Camera Controller for Presets & Smooth Flight Transitions ──
const CameraRig: React.FC<{
  cameraPreset: CameraPreset;
  selectedSensor: SensorNodeData | null;
  autoRotate: boolean;
}> = ({ cameraPreset, selectedSensor, autoRotate }) => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (!controlsRef.current) return;

    if (cameraPreset === 'topdown') {
      camera.position.set(0, 85, 0.1);
      controlsRef.current.target.set(0, 0, 0);
    } else if (cameraPreset === 'cross_section') {
      camera.position.set(0, 15, 65);
      controlsRef.current.target.set(0, 5, 0);
    } else if (cameraPreset === 'focus' && selectedSensor) {
      const [x, y, z] = geoToTerrainCoords(selectedSensor.latitude, selectedSensor.longitude);
      camera.position.set(x + 12, y + 10, z + 15);
      controlsRef.current.target.set(x, y + 2, z);
    } else {
      // Cinematic oblique preset
      camera.position.set(0, 48, 62);
      controlsRef.current.target.set(0, 2, 0);
    }
    controlsRef.current.update();
  }, [cameraPreset, selectedSensor, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
      maxPolarAngle={Math.PI / 2 - 0.05} // Do not clip under terrain pedestal
      minDistance={8}
      maxDistance={140}
    />
  );
};

// ── Main Terrain3D Component ──
export const Terrain3D: React.FC<Terrain3DProps> = ({
  sensors,
  viewMode,
  weatherMode,
  selectedSensorId,
  onSelectSensor,
  autoRotate,
  cameraPreset,
}) => {
  const selectedSensor = useMemo(
    () => sensors.find((s) => s.id === selectedSensorId) || null,
    [sensors, selectedSensorId]
  );

  return (
    <div className="w-full h-full bg-[#050811] rounded-3xl overflow-hidden relative select-none">
      <Canvas
        camera={{ position: [0, 48, 62], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => onSelectSensor(null)}
      >
        <color attach="background" args={[weatherMode === 'monsoon' ? '#040914' : '#070d1d']} />

        {/* Dynamic Atmospheric Sky & Lighting Engine */}
        {weatherMode === 'clear' && (
          <>
            <Sky
              distance={450000}
              sunPosition={[80, 25, 60]}
              inclination={0.4}
              azimuth={0.25}
              turbidity={1.5}
            />
            <ambientLight intensity={0.55} />
            <directionalLight
              position={[50, 60, 30]}
              intensity={1.6}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0001}
            />
            <Stars radius={90} depth={40} count={3500} factor={3} saturation={0} fade speed={1} />
          </>
        )}

        {weatherMode === 'overcast' && (
          <>
            <fog attach="fog" args={['#0b1329', 30, 110]} />
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[30, 50, 20]}
              intensity={0.9}
              color="#93c5fd"
            />
          </>
        )}

        {weatherMode === 'monsoon' && (
          <>
            <fog attach="fog" args={['#040914', 15, 85]} />
            <ambientLight intensity={0.25} color="#60a5fa" />
            <directionalLight
              position={[10, 40, 10]}
              intensity={0.6}
              color="#38bdf8"
            />
            {/* Cascading Rain Particles */}
            <Sparkles
              count={4500}
              scale={[90, 60, 90]}
              size={3.2}
              speed={3.5}
              color="#93c5fd"
              noise={[0.2, 1.0, 0.2]}
            />
          </>
        )}

        {/* 3D Topographic Mesh */}
        <TerrainMesh viewMode={viewMode} sensors={sensors} />

        {/* In-Situ IoT Sensor Nodes */}
        {sensors.map((sensor) => (
          <SensorBeacon
            key={sensor.id}
            sensor={sensor}
            isSelected={selectedSensorId === sensor.id}
            onSelect={() => onSelectSensor(sensor)}
          />
        ))}

        {/* Smooth Camera Flight Controller */}
        <CameraRig
          cameraPreset={cameraPreset}
          selectedSensor={selectedSensor}
          autoRotate={autoRotate}
        />
      </Canvas>
    </div>
  );
};
