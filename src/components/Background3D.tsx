import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Cloud } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';

// 3D House component
function House({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* House body */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#e8d5b7" />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[1.6, 1.5, 4]} />
        <meshStandardMaterial color="#c44536" />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.5, 1.01]} castShadow>
        <boxGeometry args={[0.6, 1.2, 0.1]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* Windows */}
      <mesh position={[-0.6, 1.3, 1.01]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#87ceeb" />
      </mesh>
      <mesh position={[0.6, 1.3, 1.01]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#87ceeb" />
      </mesh>
    </group>
  );
}

// 3D Tree component with fall colors
function Tree({ position }: { position: [number, number, number] }) {
  const fallColors = ['#ff6b35', '#ff8c42', '#ffa500', '#ff4500', '#d2691e'];
  const randomColor = fallColors[Math.floor(Math.random() * fallColors.length)];
  
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.3, 2, 8]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      {/* Foliage - Fall colors */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color={randomColor} />
      </mesh>
      <mesh position={[0, 3.2, 0]} castShadow>
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshStandardMaterial color="#ff8c42" />
      </mesh>
    </group>
  );
}

// Falling Leaf component
function FallingLeaf({ position, speed = 0.02 }: { position: [number, number, number]; speed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const rotationSpeed = useRef(Math.random() * 0.1 + 0.05);
  const swayAmount = useRef(Math.random() * 0.5 + 0.3);
  const swaySpeed = useRef(Math.random() * 0.05 + 0.02);
  const initialX = useRef(position[0]);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Fall down
      groupRef.current.position.y -= speed;
      
      // Sway side to side
      groupRef.current.position.x = initialX.current + Math.sin(clock.getElapsedTime() * swaySpeed.current) * swayAmount.current;
      
      // Rotate while falling
      groupRef.current.rotation.z += rotationSpeed.current;
      groupRef.current.rotation.x += rotationSpeed.current * 0.5;
      
      // Reset position when leaf falls below ground
      if (groupRef.current.position.y < -1) {
        groupRef.current.position.y = 15;
        initialX.current = (Math.random() - 0.5) * 30;
        groupRef.current.position.x = initialX.current;
      }
    }
  });
  
  const leafColors = ['#ff6b35', '#ff8c42', '#ffa500', '#ff4500', '#d2691e', '#8b4513'];
  const color = leafColors[Math.floor(Math.random() * leafColors.length)];
  
  return (
    <group ref={groupRef} position={position}>
      {/* Leaf shape - simple diamond */}
      <mesh castShadow>
        <boxGeometry args={[0.15, 0.2, 0.02]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// 3D Car component
function Car({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Car body */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.6, 1]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>
      {/* Car top */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[1.2, 0.6, 0.9]} />
        <meshStandardMaterial color="#cc3333" />
      </mesh>
      {/* Wheels */}
      <mesh position={[-0.7, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.7, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.7, 0, -0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.7, 0, -0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}

// 3D Bicycle with Rider component
function BikeWithRider({ position, speed = 0.05 }: { position: [number, number, number]; speed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.z += speed;
      // Reset position when bike goes too far
      if (groupRef.current.position.z > 20) {
        groupRef.current.position.z = -20;
      }
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      {/* Bike frame */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.8, 0.05, 0.05]} />
        <meshStandardMaterial color="#2196F3" />
      </mesh>
      <mesh position={[-0.2, 0.3, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.5, 0.05, 0.05]} />
        <meshStandardMaterial color="#2196F3" />
      </mesh>
      <mesh position={[0.2, 0.3, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.5, 0.05, 0.05]} />
        <meshStandardMaterial color="#2196F3" />
      </mesh>
      {/* Handlebars */}
      <mesh position={[0.4, 0.7, 0]} castShadow>
        <boxGeometry args={[0.05, 0.2, 0.4]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Seat */}
      <mesh position={[-0.3, 0.7, 0]} castShadow>
        <boxGeometry args={[0.15, 0.05, 0.2]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* Wheels */}
      <mesh position={[-0.4, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.3, 0.05, 8, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.4, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.3, 0.05, 8, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Rider - Body */}
      <mesh position={[-0.15, 1.1, 0]} castShadow>
        <boxGeometry args={[0.3, 0.5, 0.2]} />
        <meshStandardMaterial color="#ff9800" />
      </mesh>
      {/* Rider - Head */}
      <mesh position={[-0.15, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
      {/* Rider - Helmet */}
      <mesh position={[-0.15, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.17, 8, 8]} />
        <meshStandardMaterial color="#f44336" />
      </mesh>
      {/* Rider - Arms */}
      <mesh position={[0.1, 1.0, 0.15]} rotation={[0, 0, Math.PI / 3]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#ff9800" />
      </mesh>
      <mesh position={[0.1, 1.0, -0.15]} rotation={[0, 0, Math.PI / 3]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#ff9800" />
      </mesh>
      {/* Rider - Legs */}
      <mesh position={[-0.15, 0.7, 0.1]} rotation={[Math.PI / 6, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#1976D2" />
      </mesh>
      <mesh position={[-0.15, 0.7, -0.1]} rotation={[-Math.PI / 6, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#1976D2" />
      </mesh>
    </group>
  );
}

// 3D Scooter component
function Scooter({ position, speed = 0.08 }: { position: [number, number, number]; speed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.z += speed;
      // Reset position when scooter goes too far
      if (groupRef.current.position.z > 20) {
        groupRef.current.position.z = -20;
      }
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      {/* Deck */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.05, 0.25]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
      {/* Handlebar post */}
      <mesh position={[0.3, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
        <meshStandardMaterial color="#9e9e9e" />
      </mesh>
      {/* Handlebars */}
      <mesh position={[0.3, 0.85, 0]} castShadow>
        <boxGeometry args={[0.05, 0.05, 0.4]} />
        <meshStandardMaterial color="#424242" />
      </mesh>
      {/* Front wheel */}
      <mesh position={[0.35, 0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.15, 0.04, 8, 16]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      {/* Back wheel */}
      <mesh position={[-0.35, 0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.15, 0.04, 8, 16]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      {/* Fender */}
      <mesh position={[-0.35, 0.25, 0]} castShadow>
        <boxGeometry args={[0.15, 0.02, 0.28]} />
        <meshStandardMaterial color="#81C784" />
      </mesh>
    </group>
  );
}

// Ground/Street component
function Ground() {
  return (
    <group>
      {/* Street */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 30]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      
      {/* Yellow street lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[0.2, 30]} />
        <meshStandardMaterial color="#ffeb3b" />
      </mesh>
      
      {/* Sidewalk left */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, 0.02, 0]} receiveShadow>
        <planeGeometry args={[24, 30]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
      
      {/* Sidewalk right */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[12, 0.02, 0]} receiveShadow>
        <planeGeometry args={[24, 30]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
    </group>
  );
}

// Main 3D Scene
function Scene() {
  return (
    <>
      {/* Lighting setup for fall atmosphere with warm tones */}
      <ambientLight intensity={0.5} />
      
      {/* Main directional light (autumn sun) with warm tone and shadows */}
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.0}
        color="#ffcc99"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      {/* Hemisphere light for fall outdoor lighting */}
      <hemisphereLight
        args={['#ffb366', '#d2691e', 0.5]}
      />
      
      {/* Fall Sky */}
      <Sky
        distance={450000}
        sunPosition={[10, 15, 5]}
        inclination={0.5}
        azimuth={0.2}
      />
      
      {/* Clouds */}
      <Cloud position={[-10, 8, -20]} speed={0.2} opacity={0.5} />
      <Cloud position={[10, 10, -25]} speed={0.15} opacity={0.4} />
      <Cloud position={[0, 12, -30]} speed={0.25} opacity={0.6} />
      
      {/* Ground and street */}
      <Ground />
      
      {/* Houses on left sidewalk */}
      <House position={[-12, 0, -15]} />
      <House position={[-12, 0, -8]} />
      <House position={[-12, 0, 0]} />
      <House position={[-12, 0, 8]} />
      
      {/* Houses on right sidewalk */}
      <House position={[12, 0, -12]} />
      <House position={[12, 0, -4]} />
      <House position={[12, 0, 5]} />
      
      {/* Trees scattered around */}
      <Tree position={[-15, 0, -10]} />
      <Tree position={[-15, 0, 3]} />
      <Tree position={[15, 0, -7]} />
      <Tree position={[15, 0, 2]} />
      
      {/* Parked cars */}
      <Car position={[-9, 0, -5]} />
      <Car position={[9, 0, -2]} />
      
      {/* Bikes with riders */}
      <BikeWithRider position={[-8, 0, 3]} speed={0.06} />
      <BikeWithRider position={[7, 0, -8]} speed={0.05} />
      <BikeWithRider position={[-10, 0, -12]} speed={0.07} />
      
      {/* Scooters */}
      <Scooter position={[8, 0, 4]} speed={0.09} />
      <Scooter position={[-7, 0, -1]} speed={0.08} />
      <Scooter position={[9, 0, -10]} speed={0.1} />
      
      {/* Falling Leaves */}
      {Array.from({ length: 30 }).map((_, i) => (
        <FallingLeaf
          key={i}
          position={[
            (Math.random() - 0.5) * 30,
            Math.random() * 15 + 5,
            (Math.random() - 0.5) * 30
          ]}
          speed={Math.random() * 0.02 + 0.01}
        />
      ))}
    </>
  );
}

export const Background3D = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        shadows
        camera={{
          position: [0, 5, 15],
          fov: 60,
          near: 0.1,
          far: 1000
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};
