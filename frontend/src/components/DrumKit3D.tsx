import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGloveStore } from '../store/useGloveStore';

// -------------------------------------------------------------
// CAMERA CONTROLLER WITH SMOOTH PRESET TRANSITIONS
// -------------------------------------------------------------
interface CameraControllerProps {
  preset: 'front' | 'top' | 'pov';
}

const CameraController: React.FC<CameraControllerProps> = ({ preset }) => {
  const controlsRef = useRef<any>(null);

  useFrame((state) => {
    // Default: Front Stage (Audience perspective looking at front of kit)
    let targetPos = new THREE.Vector3(0, 3.2, 6.2);
    let targetLook = new THREE.Vector3(0, 1.1, 0);

    if (preset === 'top') {
      // Top-Down: Spatial overhead layout
      targetPos.set(0, 7.8, 0.05);
      targetLook.set(0, 0.5, 0);
    } else if (preset === 'pov') {
      // Drummer POV: Behind the kit looking across drums & cymbals
      targetPos.set(0, 2.25, -2.55);
      targetLook.set(0, 1.1, 0.3);
    }

    state.camera.position.lerp(targetPos, 0.08);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook, 0.08);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={true}
      enableZoom={true}
      enablePan={true}
      minDistance={1.8}
      maxDistance={12}
      maxPolarAngle={Math.PI / 2 + 0.05}
    />
  );
};

// -------------------------------------------------------------
// REALISTIC DRUM PIECE (Snare & Toms)
// -------------------------------------------------------------
interface DrumPieceProps {
  note: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  radius: number;
  depth: number;
  shellColor?: string;
  name: string;
  onClick: (note: number) => void;
}

const DrumPiece: React.FC<DrumPieceProps> = ({
  note,
  position,
  rotation = [0, 0, 0],
  radius,
  depth,
  shellColor = '#181b24',
  name,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const activeHits = useGloveStore((s) => s.activeDrumAnimations);
  const hitTime = activeHits[note] || 0;

  useFrame(() => {
    if (!groupRef.current) return;
    const now = Date.now();
    const elapsed = (now - hitTime) / 1000;

    if (elapsed < 0.4) {
      // Damped vibration pulse: skin bounce + shell vibration
      const bounce = Math.exp(-elapsed * 10) * Math.sin(elapsed * 40);
      groupRef.current.position.y = position[1] + bounce * 0.06;
      if (headRef.current) {
        headRef.current.scale.y = 1 + bounce * 0.35;
      }
    } else {
      groupRef.current.position.y = position[1];
      if (headRef.current) {
        headRef.current.scale.y = 1;
      }
    }
  });

  const isRecentlyHit = Date.now() - hitTime < 180;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onClick(note);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Lacquered Wood Drum Shell */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, depth, 32]} />
        <meshStandardMaterial
          color={isRecentlyHit ? '#ffcc80' : shellColor}
          emissive={isRecentlyHit ? '#ffb46b' : '#000000'}
          emissiveIntensity={isRecentlyHit ? 1.8 : 0}
          roughness={0.25}
          metalness={0.25}
        />
      </mesh>

      {/* Top Head Membrane */}
      <mesh ref={headRef} position={[0, depth / 2 + 0.005, 0]} receiveShadow>
        <cylinderGeometry args={[radius * 0.96, radius * 0.96, 0.02, 32]} />
        <meshStandardMaterial
          color={isRecentlyHit ? '#ffffff' : '#f8fafc'}
          emissive={isRecentlyHit ? '#ffb46b' : '#000000'}
          emissiveIntensity={isRecentlyHit ? 2.2 : 0}
          roughness={0.45}
        />
      </mesh>

      {/* Chrome Top Rim Hoop */}
      <mesh position={[0, depth / 2, 0]}>
        <torusGeometry args={[radius * 1.01, 0.026, 12, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Chrome Bottom Rim Hoop */}
      <mesh position={[0, -depth / 2, 0]}>
        <torusGeometry args={[radius * 1.01, 0.026, 12, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Chrome Tension Rod Lugs */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map((ang, i) => (
        <mesh
          key={i}
          position={[Math.cos(ang) * (radius + 0.02), 0, Math.sin(ang) * (radius + 0.02)]}
        >
          <boxGeometry args={[0.025, depth * 0.75, 0.025]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.15} />
        </mesh>
      ))}

      {/* Snare Strainer Throw-off Lever (note 38) */}
      {note === 38 && (
        <group position={[radius + 0.025, 0, 0]}>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.035, 0.12, 0.04]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[0.02, 0.1, 0]} rotation={[0, 0, 0.35]}>
            <cylinderGeometry args={[0.008, 0.008, 0.07, 8]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.9} />
          </mesh>
        </group>
      )}

      {/* Hardware Snare Basket Stand (note 38) */}
      {note === 38 && (
        <group position={[0, -depth / 2, 0]}>
          {/* Basket Arms */}
          {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((ang, i) => (
            <mesh
              key={i}
              position={[Math.cos(ang) * (radius * 0.7), -0.08, Math.sin(ang) * (radius * 0.7)]}
              rotation={[Math.sin(ang) * 0.4, 0, Math.cos(ang) * 0.4]}
            >
              <cylinderGeometry args={[0.012, 0.012, 0.28, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
            </mesh>
          ))}
          {/* Center Column */}
          <mesh position={[0, -0.4, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.8, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Snare Stand Tripod Base */}
          {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((ang, i) => (
            <mesh
              key={i}
              position={[Math.cos(ang) * 0.28, -0.65, Math.sin(ang) * 0.28]}
              rotation={[0, -ang, 0.55]}
            >
              <cylinderGeometry args={[0.014, 0.014, 0.6, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.92} roughness={0.2} />
            </mesh>
          ))}
        </group>
      )}

      {/* Floor Tom Legs (note 45) */}
      {note === 45 && (
        <group position={[0, 0, 0]}>
          {[0.3, 2.4, 4.5].map((ang, i) => (
            <group
              key={i}
              position={[Math.cos(ang) * (radius + 0.04), 0, Math.sin(ang) * (radius + 0.04)]}
              rotation={[Math.sin(ang) * 0.12, 0, -Math.cos(ang) * 0.12]}
            >
              {/* Chrome Rod */}
              <mesh position={[0, -0.5, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 1.25, 12]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
              </mesh>
              {/* Rubber Foot */}
              <mesh position={[0, -1.13, 0]}>
                <cylinderGeometry args={[0.032, 0.032, 0.06, 12]} />
                <meshStandardMaterial color="#0f172a" roughness={0.9} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Rack Tom Mounting Rods (notes 47 & 50) */}
      {(note === 47 || note === 50) && (
        <mesh position={[note === 47 ? -0.25 : 0.25, -depth / 2 - 0.2, 0]} rotation={[0, 0, note === 47 ? 0.35 : -0.35]}>
          <cylinderGeometry args={[0.018, 0.018, 0.5, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
        </mesh>
      )}
    </group>
  );
};

// -------------------------------------------------------------
// REALISTIC KICK DRUM (with beater swing & head deformation)
// -------------------------------------------------------------
interface KickDrumProps {
  note: number;
  position: [number, number, number];
  onClick: (note: number) => void;
}

const KickDrum: React.FC<KickDrumProps> = ({ note, position, onClick }) => {
  const beaterRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const activeHits = useGloveStore((s) => s.activeDrumAnimations);
  const hitTime = activeHits[note] || 0;

  useFrame(() => {
    const now = Date.now();
    const elapsed = (now - hitTime) / 1000;

    if (elapsed < 0.35) {
      // Beater swing: strikes drumhead at elapsed = 0.04
      const swing = Math.sin(elapsed * 18) * Math.exp(-elapsed * 8);
      if (beaterRef.current) {
        beaterRef.current.rotation.x = Math.max(-0.6, -swing * 0.8);
      }
      if (headRef.current) {
        // Elastic head deformation
        headRef.current.position.z = -0.65 - Math.max(0, swing * 0.05);
      }
    } else {
      if (beaterRef.current) beaterRef.current.rotation.x = 0;
      if (headRef.current) headRef.current.position.z = -0.65;
    }
  });

  const isRecentlyHit = Date.now() - hitTime < 180;

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick(note);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Bass Drum Shell */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.05, 1.3, 36]} />
        <meshStandardMaterial
          color={isRecentlyHit ? '#ffcc80' : '#141720'}
          emissive={isRecentlyHit ? '#ffb46b' : '#000000'}
          emissiveIntensity={isRecentlyHit ? 1.6 : 0}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      {/* Front Resonant Head (Audience facing at +Z) */}
      <mesh position={[0, 0, 0.65]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[1.01, 1.01, 0.02, 36]} />
        <meshStandardMaterial color="#0b0e14" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Front Resonant Head Center Smart Glove Badge */}
      <mesh position={[0, 0, 0.665]} rotation={[0, 0, 0]}>
        <circleGeometry args={[0.28, 32]} />
        <meshStandardMaterial color="#d4a373" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Batter Drumhead (playable back side at -Z) */}
      <mesh ref={headRef} position={[0, 0, -0.65]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[1.01, 1.01, 0.02, 36]} />
        <meshStandardMaterial
          color={isRecentlyHit ? '#ffffff' : '#f8fafc'}
          emissive={isRecentlyHit ? '#ffb46b' : '#000000'}
          emissiveIntensity={isRecentlyHit ? 2.4 : 0}
          roughness={0.4}
        />
      </mesh>

      {/* Chrome Hoops */}
      <mesh position={[0, 0, 0.65]}>
        <torusGeometry args={[1.06, 0.035, 12, 36]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, -0.65]}>
        <torusGeometry args={[1.06, 0.035, 12, 36]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Bass Drum Angled Spurs (Left & Right Front Legs) */}
      <group position={[-1.02, -0.4, 0.2]} rotation={[0.45, 0, -0.55]}>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.9, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
        </mesh>
        <mesh position={[0, -0.86, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.08, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>
      </group>

      <group position={[1.02, -0.4, 0.2]} rotation={[0.45, 0, 0.55]}>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.9, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
        </mesh>
        <mesh position={[0, -0.86, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.08, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>
      </group>

      {/* Double Tom Mount on top of Bass Drum */}
      <group position={[0, 1.05, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.25, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Mechanical Kick Pedal & Beater */}
      <group position={[0, -0.9, -1.05]}>
        {/* Footboard */}
        <mesh position={[0, 0.05, 0.2]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.25, 0.03, 0.5]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Pedal Tension Spring */}
        <mesh position={[0.13, 0.25, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.35, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.2} />
        </mesh>
        {/* Rotating Beater Arm */}
        <group ref={beaterRef} position={[0, 0.1, 0]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.65, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Felt Beater Head */}
          <mesh position={[0, 0.75, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.07, 16]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// -------------------------------------------------------------
// REALISTIC ANISOTROPIC CYMBAL (with damped wobble physics)
// -------------------------------------------------------------
interface CymbalPieceProps {
  note: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  radius: number;
  bellRadius?: number;
  name: string;
  onClick: (note: number) => void;
}

const CymbalPiece: React.FC<CymbalPieceProps> = ({
  note,
  position,
  rotation = [0, 0, 0],
  radius,
  bellRadius = 0.18,
  name,
  onClick,
}) => {
  const cymbalRef = useRef<THREE.Group>(null);
  const activeHits = useGloveStore((s) => s.activeDrumAnimations);
  const hitTime = activeHits[note] || 0;

  useFrame(() => {
    if (!cymbalRef.current) return;
    const now = Date.now();
    const elapsed = (now - hitTime) / 1000;

    if (elapsed < 0.8) {
      // Damped harmonic pendulum oscillation (cymbal wobble)
      const wobble = Math.sin(elapsed * 26) * Math.exp(-elapsed * 4.5);
      cymbalRef.current.rotation.z = rotation[2] + wobble * 0.22;
      cymbalRef.current.rotation.x = rotation[0] + wobble * 0.12;
    } else {
      cymbalRef.current.rotation.z = rotation[2];
      cymbalRef.current.rotation.x = rotation[0];
    }
  });

  const isRecentlyHit = Date.now() - hitTime < 180;

  return (
    <group position={position}>
      {/* Chrome Cymbal Stand Stem */}
      <mesh position={[0, -0.9, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 1.8, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Tripod Base Legs on the floor */}
      <group position={[0, -1.8, 0]}>
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((ang, i) => (
          <mesh
            key={i}
            position={[Math.cos(ang) * 0.35, 0.12, Math.sin(ang) * 0.35]}
            rotation={[0, -ang, 0.45]}
          >
            <cylinderGeometry args={[0.014, 0.014, 0.75, 12]} />
            <meshStandardMaterial color="#64748b" metalness={0.95} roughness={0.15} />
          </mesh>
        ))}
      </group>

      {/* Wobbling Cymbal Disk */}
      <group
        ref={cymbalRef}
        rotation={rotation}
        onClick={(e) => {
          e.stopPropagation();
          onClick(note);
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        {/* Lathed Bronze Cymbal Disk */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius * 0.98, 0.016, 40]} />
          <meshStandardMaterial
            color={isRecentlyHit ? '#ffcc80' : '#d4af37'}
            emissive={isRecentlyHit ? '#ffb46b' : '#2d1f05'}
            emissiveIntensity={isRecentlyHit ? 2.5 : 0.08}
            roughness={0.28}
            metalness={0.92}
          />
        </mesh>

        {/* Lathed Concentric Tonal Groove Ring */}
        <mesh position={[0, 0.01, 0]}>
          <ringGeometry args={[radius * 0.55, radius * 0.65, 36]} />
          <meshBasicMaterial color="#b38a22" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>

        {/* China Cymbal Inverted Outer Lip (note 52) */}
        {note === 52 && (
          <mesh position={[0, 0.025, 0]}>
            <torusGeometry args={[radius * 0.92, 0.025, 12, 36]} />
            <meshStandardMaterial
              color={isRecentlyHit ? '#ffcc80' : '#d4af37'}
              metalness={0.92}
              roughness={0.25}
            />
          </mesh>
        )}

        {/* Cymbal Center Bell Cup */}
        <mesh position={[0, 0.035, 0]}>
          <sphereGeometry args={[bellRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={isRecentlyHit ? '#ffffff' : '#e5c07b'}
            emissive={isRecentlyHit ? '#ffb46b' : '#3d2b07'}
            emissiveIntensity={isRecentlyHit ? 2.5 : 0.12}
            roughness={0.2}
            metalness={0.95}
          />
        </mesh>

        {/* Chrome Wing Nut Felt Top */}
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.03, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
};

// -------------------------------------------------------------
// REALISTIC HI-HAT (Open & Closed Pedal Animation)
// -------------------------------------------------------------
interface HiHatPieceProps {
  closedNote: number;
  openNote: number;
  position: [number, number, number];
  onClick: (note: number) => void;
}

const HiHatPiece: React.FC<HiHatPieceProps> = ({ closedNote, openNote, position, onClick }) => {
  const topCymbalRef = useRef<THREE.Group>(null);
  const activeHits = useGloveStore((s) => s.activeDrumAnimations);

  const closedHit = activeHits[closedNote] || 0;
  const openHit = activeHits[openNote] || 0;
  const hitTime = Math.max(closedHit, openHit);
  const isOpenHit = openHit > closedHit;

  useFrame(() => {
    if (!topCymbalRef.current) return;
    const now = Date.now();
    const elapsed = (now - hitTime) / 1000;

    let targetY = 0.04; // default slight gap
    if (elapsed < 0.5) {
      if (isOpenHit) {
        // Lifts up when open hi-hat triggers
        targetY = 0.12 + Math.sin(elapsed * 25) * 0.03 * Math.exp(-elapsed * 5);
      } else {
        // Snaps down tight when closed hi-hat triggers
        targetY = 0.015 + Math.sin(elapsed * 35) * 0.01 * Math.exp(-elapsed * 10);
      }
    }
    topCymbalRef.current.position.y = THREE.MathUtils.lerp(
      topCymbalRef.current.position.y,
      targetY,
      0.25
    );
  });

  const isRecentlyHit = Date.now() - hitTime < 180;

  return (
    <group position={position}>
      {/* Stand Center Rod */}
      <mesh position={[0, -0.85, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 1.7, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Hi-Hat Stand Tripod Base */}
      <group position={[0, -1.7, 0]}>
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((ang, i) => (
          <mesh
            key={i}
            position={[Math.cos(ang) * 0.35, 0.1, Math.sin(ang) * 0.35]}
            rotation={[0, -ang, 0.45]}
          >
            <cylinderGeometry args={[0.014, 0.014, 0.75, 12]} />
            <meshStandardMaterial color="#64748b" metalness={0.95} roughness={0.15} />
          </mesh>
        ))}
        {/* Foot Pedal on Floor */}
        <mesh position={[0, 0.05, -0.25]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.2, 0.02, 0.45]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.25} />
        </mesh>
      </group>

      {/* Bottom Cymbal (Fixed) */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0.02]} receiveShadow>
        <cylinderGeometry args={[0.55, 0.54, 0.016, 36]} />
        <meshStandardMaterial color="#c59b27" metalness={0.92} roughness={0.28} />
      </mesh>

      {/* Top Cymbal (Moving on Rod) */}
      <group
        ref={topCymbalRef}
        position={[0, 0.04, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick(closedNote);
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.54, 0.016, 36]} />
          <meshStandardMaterial
            color={isRecentlyHit ? '#ffcc80' : '#d4af37'}
            emissive={isRecentlyHit ? '#ffb46b' : '#000000'}
            emissiveIntensity={isRecentlyHit ? 2.5 : 0}
            metalness={0.92}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <sphereGeometry args={[0.12, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#e5c07b" metalness={0.95} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};

// -------------------------------------------------------------
// AUXILIARY PERCUSSION: COWBELL & CLAP
// -------------------------------------------------------------
interface AuxPercussionProps {
  note: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  type: 'cowbell' | 'clap';
  onClick: (note: number) => void;
}

const AuxPercussion: React.FC<AuxPercussionProps> = ({ note, position, rotation = [0, 0, 0], type, onClick }) => {
  const meshRef = useRef<THREE.Group>(null);
  const activeHits = useGloveStore((s) => s.activeDrumAnimations);
  const hitTime = activeHits[note] || 0;

  useFrame(() => {
    if (!meshRef.current) return;
    const now = Date.now();
    const elapsed = (now - hitTime) / 1000;

    if (elapsed < 0.3) {
      const shake = Math.sin(elapsed * 35) * Math.exp(-elapsed * 12);
      meshRef.current.position.y = position[1] + shake * 0.05;
    } else {
      meshRef.current.position.y = position[1];
    }
  });

  const isRecentlyHit = Date.now() - hitTime < 180;

  return (
    <group
      ref={meshRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onClick(note);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {type === 'cowbell' ? (
        <group>
          {/* Trapezoidal Brushed Steel Cowbell Shell */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.09, 0.19, 0.36, 4]} />
            <meshStandardMaterial
              color={isRecentlyHit ? '#ffcc80' : '#334155'}
              emissive={isRecentlyHit ? '#ffb46b' : '#000000'}
              emissiveIntensity={isRecentlyHit ? 2.5 : 0}
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
          {/* Mounting clamp to bass drum */}
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} />
          </mesh>
        </group>
      ) : (
        <group>
          {/* Acoustic Wooden Clap Block */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.32, 0.09, 0.22]} />
            <meshStandardMaterial
              color={isRecentlyHit ? '#ffffff' : '#b45309'}
              emissive={isRecentlyHit ? '#ffb46b' : '#451a03'}
              emissiveIntensity={isRecentlyHit ? 2.5 : 0.1}
              roughness={0.45}
              metalness={0.1}
            />
          </mesh>
          {/* Mounting bracket */}
          <mesh position={[0, -0.07, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.1, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// -------------------------------------------------------------
// DRUMMER THRONE (Professional padded stool)
// -------------------------------------------------------------
const DrummerThrone: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Padded Seat Cushion */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.14, 24]} />
        <meshStandardMaterial color="#111318" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Chrome Center Stem */}
      <mesh position={[0, -0.32, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.5, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
      </mesh>
      {/* Heavy-duty Tripod Base */}
      <group position={[0, -0.57, 0]}>
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((ang, i) => (
          <mesh
            key={i}
            position={[Math.cos(ang) * 0.35, 0.1, Math.sin(ang) * 0.35]}
            rotation={[0, -ang, 0.5]}
          >
            <cylinderGeometry args={[0.016, 0.016, 0.65, 12]} />
            <meshStandardMaterial color="#64748b" metalness={0.95} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// -------------------------------------------------------------
// COMPLETE 14-PIECE INTERACTIVE 3D DRUM KIT
// -------------------------------------------------------------
export interface DrumKit3DProps {
  className?: string;
  onPadClick?: (note: number) => void;
}

export const DrumKit3D: React.FC<DrumKit3DProps> = ({ className = 'w-full h-full', onPadClick }) => {
  const { triggerTestNote, cameraPreset, setCameraPreset } = useGloveStore();

  const handleDrumTrigger = (note: number) => {
    triggerTestNote(note, 110);
    if (onPadClick) onPadClick(note);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Top Camera Presets Switcher */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#12141a]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono">
        <span className="text-studio-creamMuted text-[10px]">CAMERA:</span>
        <button
          onClick={() => setCameraPreset('pov')}
          className={`px-2.5 py-1 rounded-lg transition-all ${
            cameraPreset === 'pov'
              ? 'bg-studio-gold text-black font-bold shadow-glowGold'
              : 'text-studio-creamMuted hover:text-white'
          }`}
        >
          DRUMMER POV
        </button>
        <button
          onClick={() => setCameraPreset('front')}
          className={`px-2.5 py-1 rounded-lg transition-all ${
            cameraPreset === 'front'
              ? 'bg-studio-gold text-black font-bold shadow-glowGold'
              : 'text-studio-creamMuted hover:text-white'
          }`}
        >
          FRONT STAGE
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          className={`px-2.5 py-1 rounded-lg transition-all ${
            cameraPreset === 'top'
              ? 'bg-studio-gold text-black font-bold shadow-glowGold'
              : 'text-studio-creamMuted hover:text-white'
          }`}
        >
          TOP-DOWN
        </button>
      </div>

      <Canvas
        camera={{ position: [0, 3.2, 6.2], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true, toneMappingExposure: 1.2 }}
      >
        {/* Studio Lighting Rig */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.5}
          color="#fff5eb"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-5, 6, -4]} intensity={1.0} color="#38bdf8" />
        <directionalLight position={[0, 4, -6]} intensity={0.7} color="#d4a373" />

        {/* Camera Preset Manager */}
        <CameraController preset={cameraPreset} />

        {/* ---------------- 14-PIECE DRUM KIT RIG ---------------- */}
        <group position={[0, 0, 0]}>
          {/* 1. Bass Kick Drum (#36) */}
          <KickDrum note={36} position={[0, 1.05, 0]} onClick={handleDrumTrigger} />

          {/* 2. Snare Drum (#38) - player left knee */}
          <DrumPiece
            note={38}
            position={[-1.0, 1.35, -0.6]}
            rotation={[0.12, 0.25, 0]}
            radius={0.56}
            depth={0.32}
            shellColor="#222736"
            name="SNARE"
            onClick={handleDrumTrigger}
          />

          {/* 3 & 4. Hi-Hats (Closed #42 / Open #46) - player left foot */}
          <HiHatPiece
            closedNote={42}
            openNote={46}
            position={[-1.65, 1.85, -0.5]}
            onClick={handleDrumTrigger}
          />

          {/* 5. Low / Floor Tom (#45) - player right knee */}
          <DrumPiece
            note={45}
            position={[1.3, 1.25, -0.5]}
            rotation={[0.1, -0.2, 0]}
            radius={0.65}
            depth={0.5}
            shellColor="#1c202a"
            name="LOW TOM"
            onClick={handleDrumTrigger}
          />

          {/* 6. Mid Rack Tom (#47) - top right of kick */}
          <DrumPiece
            note={47}
            position={[0.55, 2.15, -0.1]}
            rotation={[0.25, -0.2, 0]}
            radius={0.46}
            depth={0.38}
            shellColor="#1c202a"
            name="MID TOM"
            onClick={handleDrumTrigger}
          />

          {/* 7. High Rack Tom (#50) - top left of kick */}
          <DrumPiece
            note={50}
            position={[-0.55, 2.15, -0.1]}
            rotation={[0.25, 0.2, 0]}
            radius={0.42}
            depth={0.36}
            shellColor="#1c202a"
            name="HIGH TOM"
            onClick={handleDrumTrigger}
          />

          {/* 8. Crash Cymbal (#49) - high left overhead */}
          <CymbalPiece
            note={49}
            position={[-1.65, 2.65, 0.1]}
            rotation={[-0.2, 0.3, 0]}
            radius={0.82}
            name="CRASH"
            onClick={handleDrumTrigger}
          />

          {/* 9. Ride Cymbal (#51) - right overhead */}
          <CymbalPiece
            note={51}
            position={[1.65, 2.45, -0.2]}
            rotation={[-0.25, -0.3, 0]}
            radius={0.98}
            name="RIDE"
            onClick={handleDrumTrigger}
          />

          {/* 10. Ride Bell (#53) - center cup of ride */}
          <CymbalPiece
            note={53}
            position={[1.65, 2.52, -0.2]}
            rotation={[-0.2, -0.2, 0]}
            radius={0.45}
            bellRadius={0.24}
            name="RIDE BELL"
            onClick={handleDrumTrigger}
          />

          {/* 11. China Cymbal (#52) - far right effect */}
          <CymbalPiece
            note={52}
            position={[2.1, 2.65, 0.2]}
            rotation={[-0.35, -0.4, 0]}
            radius={0.88}
            name="CHINA"
            onClick={handleDrumTrigger}
          />

          {/* 12. Splash Cymbal (#55) - center small cymbal */}
          <CymbalPiece
            note={55}
            position={[0, 2.75, 0.1]}
            rotation={[-0.18, 0, 0]}
            radius={0.45}
            name="SPLASH"
            onClick={handleDrumTrigger}
          />

          {/* 13. Cowbell (#56) - mounted on kick hoop */}
          <AuxPercussion
            note={56}
            position={[0.3, 1.95, -0.35]}
            rotation={[-0.3, 0.15, 0]}
            type="cowbell"
            onClick={handleDrumTrigger}
          />

          {/* 14. Clap Sound Block (#39) - left auxiliary */}
          <AuxPercussion
            note={39}
            position={[-0.8, 1.6, -0.6]}
            rotation={[0.1, 0.35, 0]}
            type="clap"
            onClick={handleDrumTrigger}
          />

          {/* Drummer Throne (Padded Seat) */}
          <DrummerThrone position={[0, 0.65, -2.1]} />
        </group>

        {/* Contact Shadow & Floor Circle */}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.7}
          scale={10}
          blur={2.5}
          far={6}
          color="#000000"
        />
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[4.5, 64]} />
          <meshBasicMaterial color="#10131a" transparent opacity={0.8} />
        </mesh>

        {/* Post-Processing Bloom */}
        <EffectComposer>
          <Bloom intensity={0.65} luminanceThreshold={0.85} luminanceSmoothing={0.3} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default DrumKit3D;
