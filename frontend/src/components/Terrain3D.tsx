import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sky, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SensorNodeData } from '../hooks/useLiveTelemetry';

interface Terrain3DProps {
  sensors: SensorNodeData[];
  weatherOn: boolean;
}

// Compute a simplistic risk score to map to colors
const computeRiskColor = (sensor: SensorNodeData) => {
  const SM = sensor.soil_moisture;
  const rain = sensor.rain_24h_obs;
  const pore = Math.min(120, SM * 0.9);
  const incl = Math.min(0.12, pore * 0.00055 + rain * 0.00025);
  const tVal = 0.018 * rain + 0.005 * sensor.api_7d + 0.022 * pore + 20.0 * incl - 1.95;
  const prob = 1 / (1 + Math.exp(-tVal));
  
  if (prob > 0.80) return 'red';
  if (prob > 0.50) return 'orange';
  if (prob > 0.15) return 'yellow';
  return 'green';
};

// Procedural Terrain Placeholder
const ProceduralTerrain = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create a bumpy plane for placeholder terrain
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(100, 100, 64, 64);
    geo.rotateX(-Math.PI / 2);
    
    // Add some random noise to vertices to simulate hills
    const position = geo.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      // Simple sine wave displacement
      const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2 + Math.sin(x * 0.05) * 4;
      position.setY(i, y);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#2d4c1e" wireframe={false} />
    </mesh>
  );
};

// Map sensors to 3D space
const SensorMarkers = ({ sensors }: { sensors: SensorNodeData[] }) => {
  // We need to map lat/lon to our 100x100 plane.
  // Assuming bounds roughly covering NER: Lat ~22-30, Lon ~89-98
  const mapCoordinates = (lat: number, lon: number) => {
    const latMin = 22, latMax = 30;
    const lonMin = 89, lonMax = 98;
    
    const x = ((lon - lonMin) / (lonMax - lonMin)) * 100 - 50;
    const z = -(((lat - latMin) / (latMax - latMin)) * 100 - 50); // Invert lat so north is -z
    // The Y height should match the terrain at x, z. Hardcoding an approximate height for now.
    return [x, 5, z] as [number, number, number];
  };

  return (
    <>
      {sensors.map((sensor) => {
        const [x, y, z] = mapCoordinates(sensor.latitude, sensor.longitude);
        const color = computeRiskColor(sensor);
        const isHighRisk = color === 'red' || color === 'orange';
        
        return (
          <group key={sensor.id} position={[x, y, z]}>
            {/* Marker */}
            <mesh castShadow position={[0, 2, 0]}>
              <cylinderGeometry args={[0, 1, 4, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
            
            {/* Html Label */}
            <Html distanceFactor={50} position={[0, 5, 0]}>
              <div className="bg-black/75 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-white/20">
                {sensor.name} <br/>
                Risk: {color.toUpperCase()} <br/>
                Rain: {sensor.rain_24h_obs}mm
              </div>
            </Html>

            {/* Evacuation Range (Ring) for High Risk */}
            {isHighRisk && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.8, 0]}>
                <ringGeometry args={[3, 4, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
};

export const Terrain3D: React.FC<Terrain3DProps> = ({ sensors, weatherOn }) => {
  return (
    <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden relative min-h-[500px]">
      {/* Disclaimer Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-black/60 text-white p-3 rounded-md text-sm border border-white/10 pointer-events-none">
        <h3 className="font-bold mb-1 flex items-center">
          <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
          Live 3D Terrain & Risk Model
        </h3>
        <p className="text-gray-300">Showing procedural terrain placeholder.<br/>Weather is {weatherOn ? 'active (Rain)' : 'clear'}.</p>
      </div>

      <Canvas camera={{ position: [0, 40, 60], fov: 45 }} shadows>
        <color attach="background" args={['#0f172a']} />
        
        <ambientLight intensity={weatherOn ? 0.2 : 0.6} />
        <directionalLight 
          position={[50, 50, 20]} 
          intensity={weatherOn ? 0.5 : 1.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />
        
        {/* Environment */}
        {!weatherOn ? (
          <>
            <Sky sunPosition={[100, 20, 100]} turbidity={0.1} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          </>
        ) : (
          <fog attach="fog" args={['#0f172a', 10, 80]} />
        )}

        {/* Rain Particles using Sparkles for simplicity */}
        {weatherOn && (
          <Sparkles 
            count={3000} 
            scale={[100, 100, 100]} 
            size={4} 
            speed={1.5} 
            color="#a3b8cc"
            noise={[0, 1, 0]}
          />
        )}

        <ProceduralTerrain />
        <SensorMarkers sensors={sensors} />
        
        <OrbitControls 
          maxPolarAngle={Math.PI / 2 - 0.05} // Don't go below ground
          minDistance={10} 
          maxDistance={150} 
        />
      </Canvas>
    </div>
  );
};
