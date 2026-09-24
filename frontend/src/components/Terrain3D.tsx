import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Sky, Sparkles, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { SensorNodeData } from '../hooks/useLiveTelemetry';
import { computeSensorRisk } from '../lib/riskUtils';
import { ShieldAlert, Activity, Droplets, Gauge, Compass, Eye, Info, Layers } from 'lucide-react';

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

// ── Geographic Bounding Coordinates for Northeast India (NER) ──
const LAT_MIN = 21.8;
const LAT_MAX = 29.5;
const LON_MIN = 88.0;
const LON_MAX = 97.4;

const TERRAIN_WIDTH = 130;  // X axis (Longitude)
const TERRAIN_DEPTH = 110;  // Z axis (Latitude)

// Helper for risk metrics compatible with TerrainAnalysisPage
export function computeRiskMetrics(sensor: SensorNodeData) {
  const r = computeSensorRisk(sensor);
  return {
    prob: r.prob,
    level: r.score >= 8.5 ? 'CRITICAL' : r.score >= 6.8 ? 'HIGH' : r.score >= 4.0 ? 'MODERATE' : 'SAFE',
    color: r.color,
    glowColor: r.color,
    pore: Math.min(120, (sensor.soil_moisture || 25) * 0.88),
    incl: Math.min(0.12, ((sensor.soil_moisture || 25) * 0.88 > 50 ? 0.04 : 0.005)),
  };
}

// Convert real Indian lat/lon to 3D terrain local coordinates
export function geoToTerrainCoords(lat: number, lon: number): [number, number, number] {
  const normX = (lon - LON_MIN) / (LON_MAX - LON_MIN);
  const normZ = (lat - LAT_MIN) / (LAT_MAX - LAT_MIN);

  const x = (normX - 0.5) * TERRAIN_WIDTH;
  const z = -(normZ - 0.5) * TERRAIN_DEPTH;
  const y = getNerTerrainHeight(x, z);

  return [x, y, z];
}

// ── Perlin / Fractal noise for mountain ridge crags ──
function hash2D(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

function noise2D(x: number, z: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const fx = x - i;
  const fz = z - j;

  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);

  const s00 = hash2D(i, j);
  const s10 = hash2D(i + 1, j);
  const s01 = hash2D(i, j + 1);
  const s11 = hash2D(i + 1, j + 1);

  return (s00 * (1 - u) + s10 * u) * (1 - v) + (s01 * (1 - u) + s11 * u) * v;
}

/**
 * Realistic Physiographic Height Function for Northeast India (NER)
 * Correctly models:
 * 1. Northern Himalayan Ridge (Arunachal Pradesh & Sikkim) - high alpine peaks
 * 2. Central Brahmaputra River Valley (Assam) - low valley basin carving SW
 * 3. Shillong Plateau (Meghalaya) - high tableland south of Brahmaputra
 * 4. Indo-Burma / Naga / Mizo Fold Belt - parallel mountain ridges in the east & south
 * 5. Siliguri corridor connecting to mainland India in the west
 */
export function getNerTerrainHeight(x: number, z: number): number {
  // Normalize coordinates into [0, 1] relative to NER bounding box
  const u = x / TERRAIN_WIDTH + 0.5;   // 0 = West (Sikkim/Bengal), 1 = East (Arunachal/Myanmar)
  const v = -z / TERRAIN_DEPTH + 0.5;  // 0 = South (Mizoram), 1 = North (Arunachal Himalayas)

  let baseH = 0;

  // 1. NORTHERN HIMALAYAN WALL (Arunachal Pradesh & Sikkim, v > 0.65)
  if (v > 0.60) {
    const himalayaFactor = (v - 0.60) / 0.40;
    // Rises up to 18 units in high Himalayas
    baseH += Math.pow(himalayaFactor, 1.3) * 16.5;
    // Add jagged glaciated peaks
    baseH += noise2D(x * 0.12, z * 0.12) * 4.5 * himalayaFactor;
  }

  // 2. CENTRAL BRAHMAPUTRA VALLEY (Assam, v between 0.42 and 0.65, u between 0.15 and 0.85)
  // Low elevation corridor (1.0 - 2.5 units) where the Brahmaputra flows
  const valleyCenterV = 0.54 + Math.sin(u * Math.PI) * 0.06;
  const distFromValley = Math.abs(v - valleyCenterV);
  if (distFromValley < 0.12 && u > 0.12 && u < 0.88) {
    const trough = (0.12 - distFromValley) / 0.12;
    baseH -= trough * 5.5;
  }

  // 3. MEGHALAYA / SHILLONG PLATEAU (u: 0.25 to 0.48, v: 0.38 to 0.50)
  // Distinct elevated tableland south of Assam valley
  if (u >= 0.22 && u <= 0.48 && v >= 0.36 && v <= 0.50) {
    const platX = (u - 0.35) / 0.13;
    const platZ = (v - 0.43) / 0.07;
    const platDist = platX * platX + platZ * platZ;
    if (platDist < 1.0) {
      const plateauLift = Math.cos(platDist * (Math.PI / 2)) * 6.5;
      baseH += Math.max(0, plateauLift);
    }
  }

  // 4. EASTERN & SOUTHERN FOLD MOUNTAINS (Nagaland, Manipur, Mizoram, Patkai)
  // u > 0.55 or (v < 0.40)
  if (u > 0.52 || v < 0.42) {
    // Parallel anticline ridges (NNE - SSW trend characteristic of Indo-Burma ranges)
    const ridgePattern = Math.sin(x * 0.22 + z * 0.08);
    const ridgeH = Math.max(0, ridgePattern) * 5.5;
    const eastFactor = Math.max(0, (u - 0.50) / 0.50) + Math.max(0, (0.42 - v) / 0.42);
    baseH += (ridgeH + noise2D(x * 0.08, z * 0.08) * 3.0) * Math.min(1.4, eastFactor * 0.9);
  }

  // 5. High-frequency geological scree & detail
  baseH += noise2D(x * 0.25, z * 0.25) * 1.2;

  // 6. Regional Landmass Falloff (Northeast India natural land border)
  const edgeDist = Math.max(
    Math.abs(x) / (TERRAIN_WIDTH * 0.48),
    Math.abs(z) / (TERRAIN_DEPTH * 0.48)
  );
  const falloff = Math.max(0, 1 - Math.pow(Math.min(1, edgeDist), 4));

  return Math.max(0.5, baseH * falloff);
}

/**
 * Generate high-resolution authentic geographical texture map of Northeast India
 * Contains actual Indian state boundary lines, state labels, and the Brahmaputra River.
 */
function createNerGeographicTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1728;
  const ctx = canvas.getContext('2d')!;

  // 1. Base regional terrain color (lush valleys to rugged alpine)
  const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
  gradient.addColorStop(0, '#0f2418');     // Southern lush rainforest (Mizoram/Tripura)
  gradient.addColorStop(0.35, '#133523');  // Meghalaya tableland & Barak valley
  gradient.addColorStop(0.55, '#194931');  // Assam Brahmaputra fertile basin
  gradient.addColorStop(0.80, '#2d4536');  // Sub-Himalayan foothills
  gradient.addColorStop(1.0, '#4a5763');   // Alpine high ridges & snow scree
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle terrain noise texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < 4000; i++) {
    const rx = Math.random() * canvas.width;
    const ry = Math.random() * canvas.height;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // 2. Brahmaputra River & Major Tributaries
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#0284c7';
  ctx.shadowBlur = 12;

  // Brahmaputra Main Course (Enters from Arunachal east, winds through Assam to west)
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.86, canvas.height * 0.28); // Sadiya / Pasighat entry
  ctx.bezierCurveTo(
    canvas.width * 0.72, canvas.height * 0.38,
    canvas.width * 0.58, canvas.height * 0.44,
    canvas.width * 0.42, canvas.height * 0.46
  );
  ctx.bezierCurveTo(
    canvas.width * 0.32, canvas.height * 0.48,
    canvas.width * 0.22, canvas.height * 0.50,
    canvas.width * 0.12, canvas.height * 0.52 // Guwahati -> Dhubri
  );
  ctx.stroke();

  // Tributaries
  ctx.lineWidth = 6;
  // Subansiri River (North to Brahmaputra)
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.65, canvas.height * 0.18);
  ctx.quadraticCurveTo(canvas.width * 0.63, canvas.height * 0.32, canvas.width * 0.60, canvas.height * 0.42);
  ctx.stroke();

  // Barak River (South - Cachar & Silchar)
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.62, canvas.height * 0.68);
  ctx.quadraticCurveTo(canvas.width * 0.48, canvas.height * 0.66, canvas.width * 0.38, canvas.height * 0.68);
  ctx.stroke();

  ctx.shadowBlur = 0;

  // 3. Indian State Boundaries (Semi-luminous dashed border lines)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([12, 8]);

  // Assam - Meghalaya border
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.22, canvas.height * 0.54);
  ctx.lineTo(canvas.width * 0.46, canvas.height * 0.54);
  ctx.stroke();

  // Assam - Arunachal border
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.35, canvas.height * 0.34);
  ctx.lineTo(canvas.width * 0.78, canvas.height * 0.32);
  ctx.stroke();

  // Assam - Nagaland border
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.62, canvas.height * 0.44);
  ctx.lineTo(canvas.width * 0.68, canvas.height * 0.60);
  ctx.stroke();

  // Nagaland - Manipur border
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.62, canvas.height * 0.60);
  ctx.lineTo(canvas.width * 0.74, canvas.height * 0.60);
  ctx.stroke();

  // Manipur - Mizoram border
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.54, canvas.height * 0.74);
  ctx.lineTo(canvas.width * 0.70, canvas.height * 0.74);
  ctx.stroke();

  // Tripura border
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.28, canvas.height * 0.70);
  ctx.lineTo(canvas.width * 0.38, canvas.height * 0.70);
  ctx.lineTo(canvas.width * 0.38, canvas.height * 0.86);
  ctx.stroke();

  // Sikkim border (West standalone)
  ctx.beginPath();
  ctx.arc(canvas.width * 0.12, canvas.height * 0.25, 60, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]); // Reset line dash

  // 4. Regional State Geographic Labels
  ctx.font = 'bold 32px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.textAlign = 'center';

  ctx.fillText('ARUNACHAL PRADESH', canvas.width * 0.65, canvas.height * 0.22);
  ctx.fillText('ASSAM (BRAHMAPUTRA VALLEY)', canvas.width * 0.48, canvas.height * 0.42);
  ctx.fillText('MEGHALAYA', canvas.width * 0.34, canvas.height * 0.58);
  ctx.fillText('NAGALAND', canvas.width * 0.72, canvas.height * 0.52);
  ctx.fillText('MANIPUR', canvas.width * 0.70, canvas.height * 0.67);
  ctx.fillText('MIZORAM', canvas.width * 0.58, canvas.height * 0.84);
  ctx.fillText('TRIPURA', canvas.width * 0.32, canvas.height * 0.78);
  ctx.fillText('SIKKIM', canvas.width * 0.12, canvas.height * 0.22);

  // International frontier labels
  ctx.font = 'italic bold 22px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.fillText('BHUTAN', canvas.width * 0.28, canvas.height * 0.28);
  ctx.fillText('BANGLADESH', canvas.width * 0.20, canvas.height * 0.66);
  ctx.fillText('MYANMAR', canvas.width * 0.88, canvas.height * 0.70);
  ctx.fillText('TIBET / HIMALAYAN CREST', canvas.width * 0.65, canvas.height * 0.08);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  return texture;
}

// ── Terrain Mesh Component ──
const NerTerrainMesh: React.FC<{
  viewMode: TerrainViewMode;
  sensors: SensorNodeData[];
}> = ({ viewMode, sensors }) => {
  const geoTexture = useMemo(() => createNerGeographicTexture(), []);

  // Precompute sensor risk hot spots for heatmap blending
  const sensorHotspots = useMemo(() => {
    return sensors.map(s => {
      const [x, y, z] = geoToTerrainCoords(s.latitude, s.longitude);
      const risk = computeSensorRisk(s);
      return { x, y, z, score: risk.score, prob: risk.prob, isCritical: risk.score >= 8.5 };
    });
  }, [sensors]);

  const { geometry } = useMemo(() => {
    const segmentsX = 140;
    const segmentsZ = 120;
    const geo = new THREE.PlaneGeometry(TERRAIN_WIDTH, TERRAIN_DEPTH, segmentsX, segmentsZ);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const vertexCount = pos.count;
    const colorArray = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getNerTerrainHeight(x, z);
      pos.setY(i, y);

      let r = 0.12, g = 0.28, b = 0.18; // Default lush green

      if (viewMode === 'heatmap') {
        // AI Risk Thermal Heatmap Mode:
        // Calculates localized Gaussian thermal hot zones ONLY around high-risk and critical sensors
        let hazardEnergy = 0.0;

        for (const s of sensorHotspots) {
          if (s.score >= 6.8) {
            const dx = x - s.x;
            const dz = z - s.z;
            const distSq = dx * dx + dz * dz;
            // Tightly localized Gaussian radius falloff (radius ~ 6-8 units)
            const decay = s.isCritical ? 35 : 22;
            const weight = Math.exp(-distSq / decay);
            hazardEnergy += (s.score / 10.0) * weight;
          }
        }

        const riskValue = Math.min(1.0, hazardEnergy);

        if (riskValue < 0.15) {
          // Cool emerald nominal state
          r = 0.08; g = 0.32; b = 0.20;
        } else if (riskValue < 0.50) {
          // Amber caution zone
          const t = (riskValue - 0.15) / 0.35;
          r = 0.15 + t * 0.80;
          g = 0.35 + t * 0.35;
          b = 0.20 - t * 0.15;
        } else {
          // Vivid Crimson landslide hazard hotspot
          const t = (riskValue - 0.50) / 0.50;
          r = 0.95;
          g = 0.65 - t * 0.55;
          b = 0.08;
        }
      } else if (viewMode === 'lidar') {
        // Tactical LiDAR elevation contours
        const contour = Math.abs(Math.sin(y * 1.8)) > 0.82 ? 1.0 : 0.18;
        r = 0.02 + contour * 0.15;
        g = 0.12 + contour * 0.75;
        b = 0.25 + contour * 0.85;
      } else {
        // Satellite elevation tint
        const t = Math.min(1, y / 14.0);
        r = 0.10 + t * 0.25;
        g = 0.24 + t * 0.10;
        b = 0.16 + t * 0.22;
      }

      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    return { geometry: geo };
  }, [viewMode, sensorHotspots]);

  return (
    <group>
      {/* Primary Topographic Surface */}
      <mesh geometry={geometry} receiveShadow castShadow>
        {viewMode === 'satellite' ? (
          <meshStandardMaterial
            map={geoTexture}
            roughness={0.78}
            metalness={0.15}
            flatShading={false}
          />
        ) : viewMode === 'lidar' ? (
          <meshStandardMaterial
            vertexColors
            wireframe={true}
            roughness={0.3}
            metalness={0.8}
            emissive="#00e5ff"
            emissiveIntensity={0.2}
          />
        ) : (
          <meshStandardMaterial
            vertexColors
            roughness={0.75}
            metalness={0.2}
          />
        )}
      </mesh>

      {/* River Basin Waterbed Plane with Realistic Blue Water Sheen */}
      {viewMode === 'satellite' && (
        <mesh position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TERRAIN_WIDTH * 1.05, TERRAIN_DEPTH * 1.05]} />
          <meshStandardMaterial
            color="#0369a1"
            roughness={0.15}
            metalness={0.85}
            transparent
            opacity={0.35}
          />
        </mesh>
      )}

      {/* Elegant Indian Regional Geodetic Base Crust */}
      <mesh position={[0, -2.5, 0]}>
        <boxGeometry args={[TERRAIN_WIDTH + 4, 4.5, TERRAIN_DEPTH + 4]} />
        <meshStandardMaterial
          color="#0b1120"
          roughness={0.9}
          metalness={0.4}
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

  // Use the single unified risk engine from riskUtils.ts
  const risk = useMemo(() => computeSensorRisk(sensor), [sensor]);
  const { color, label, shortLabel, score, prob } = risk;

  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.5;
      const scale = 1 + Math.sin(t * 3 + x) * 0.12;
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Ground Hazard Radial Ring */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
      >
        <ringGeometry args={[isSelected ? 2.2 : 1.0, isSelected ? 3.0 : 1.6, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.9 : score >= 8.5 ? 0.75 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Holographic Vertical Laser Column */}
      <mesh position={[0, 4.0, 0]}>
        <cylinderGeometry args={[0.08, 0.22, 8, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.8 : score >= 8.5 ? 0.65 : 0.25}
        />
      </mesh>

      {/* Beacon Floating Gem / Pin */}
      <Float speed={2.5} rotationIntensity={0.8} floatIntensity={0.5}>
        <group
          position={[0, 2.8, 0]}
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
            <octahedronGeometry args={[isSelected ? 1.3 : 0.85, 0]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isSelected ? 2.0 : hovered ? 1.5 : score >= 8.5 ? 1.2 : 0.6}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>

          {/* Core Energy Sphere */}
          <mesh>
            <sphereGeometry args={[isSelected ? 0.5 : 0.35, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      </Float>

      {/* 3D Interactive HTML Overlay Card */}
      {(hovered || isSelected) && (
        <Html
          position={[0, 6.5, 0]}
          center
          distanceFactor={40}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`cursor-pointer select-none transition-all duration-300 backdrop-blur-xl border rounded-2xl shadow-2xl p-3 min-w-[220px] ${
              isSelected
                ? 'bg-slate-900/95 border-blue-400 ring-2 ring-blue-500/50 scale-105'
                : 'bg-slate-950/90 border-slate-700/80 hover:scale-105'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 animate-ping"
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
                {shortLabel}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 font-semibold mb-2">
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                <div className="text-[8px] text-slate-400 uppercase font-black">Risk Score</div>
                <div className="text-xs font-mono font-black" style={{ color }}>
                  {score.toFixed(1)}/10
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
              <span>API: {sensor.api_7d.toFixed(0)}mm</span>
              <span>Lat: {sensor.latitude.toFixed(2)}°</span>
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
      camera.position.set(0, 95, 0.1);
      controlsRef.current.target.set(0, 0, 0);
    } else if (cameraPreset === 'cross_section') {
      camera.position.set(0, 18, 75);
      controlsRef.current.target.set(0, 6, 0);
    } else if (cameraPreset === 'focus' && selectedSensor) {
      const [x, y, z] = geoToTerrainCoords(selectedSensor.latitude, selectedSensor.longitude);
      camera.position.set(x + 14, y + 12, z + 18);
      controlsRef.current.target.set(x, y + 2, z);
    } else {
      // Cinematic oblique preset
      camera.position.set(0, 55, 72);
      controlsRef.current.target.set(0, 4, 0);
    }
    controlsRef.current.update();
  }, [cameraPreset, selectedSensor, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      autoRotate={autoRotate}
      autoRotateSpeed={0.6}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={10}
      maxDistance={160}
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
    <div className="w-full h-full bg-[#030712] rounded-3xl overflow-hidden relative select-none">
      <Canvas
        camera={{ position: [0, 55, 72], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => onSelectSensor(null)}
      >
        <color attach="background" args={[weatherMode === 'monsoon' ? '#020617' : '#040817']} />

        {/* Dynamic Atmospheric Sky & Lighting */}
        {weatherMode === 'clear' && (
          <>
            <Sky
              distance={450000}
              sunPosition={[70, 35, 50]}
              inclination={0.4}
              azimuth={0.25}
              turbidity={1.2}
            />
            <ambientLight intensity={0.6} />
            <directionalLight
              position={[45, 65, 35]}
              intensity={1.7}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0001}
            />
            <Stars radius={100} depth={40} count={3000} factor={3} saturation={0} fade speed={1} />
          </>
        )}

        {weatherMode === 'overcast' && (
          <>
            <fog attach="fog" args={['#090e1f', 35, 120]} />
            <ambientLight intensity={0.45} />
            <directionalLight
              position={[30, 50, 20]}
              intensity={1.0}
              color="#93c5fd"
            />
          </>
        )}

        {weatherMode === 'monsoon' && (
          <>
            <fog attach="fog" args={['#030712', 20, 95]} />
            <ambientLight intensity={0.3} color="#60a5fa" />
            <directionalLight
              position={[10, 45, 15]}
              intensity={0.7}
              color="#38bdf8"
            />
            <Sparkles
              count={4000}
              scale={[110, 65, 110]}
              size={3.0}
              speed={3.2}
              color="#93c5fd"
              noise={[0.2, 1.0, 0.2]}
            />
          </>
        )}

        {/* 3D Topographic Mesh of Northeast India */}
        <NerTerrainMesh viewMode={viewMode} sensors={sensors} />

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

      {/* India & NER Geodetic Frame HUD Overlay */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 rounded-xl px-3 py-1.5 text-[9px] font-mono text-slate-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>INDIA • NORTHEAST REGION (NER) GEODETIC DATUM [88°E–97°E | 22°N–29.5°N]</span>
      </div>
    </div>
  );
};
