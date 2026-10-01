import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useGloveStore } from '../store/useGloveStore';

// Individual Finger Segment Component
interface FingerSegmentProps {
  length: number;
  radius: number;
  isHit: boolean;
  children?: React.ReactNode;
}

const FingerSegment: React.FC<FingerSegmentProps> = ({ length, radius, isHit, children }) => {
  return (
    <group>
      {/* Phalanx Bone Mesh */}
      <mesh position={[0, length / 2, 0]}>
        <cylinderGeometry args={[radius * 0.85, radius, length, 12]} />
        <meshStandardMaterial
          color={isHit ? '#ffeedd' : '#222834'}
          emissive={isHit ? '#ffb46b' : '#35c3ff'}
          emissiveIntensity={isHit ? 2.5 : 0.08}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Joint Knuckle Ring */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[radius * 1.15, 12, 12]} />
        <meshStandardMaterial
          color={isHit ? '#ffb46b' : '#35c3ff'}
          emissive={isHit ? '#ffb46b' : '#35c3ff'}
          emissiveIntensity={isHit ? 3.0 : 0.4}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Child joint container placed at the tip of this segment */}
      <group position={[0, length, 0]}>{children}</group>
    </group>
  );
};

// 3D Procedural Hand Model Component
interface HandModelProps {
  side: 'rh' | 'lh';
}

const HandModel: React.FC<HandModelProps> = ({ side }) => {
  const isHit = useGloveStore((s) => s.isHandFlashing);
  const gloveState = useGloveStore((s) => s[side]);

  const handGroup = useRef<THREE.Group>(null);

  // Finger Joint Refs (MCP = knuckle, PIP = middle, DIP = tip)
  const indexMCP = useRef<THREE.Group>(null);
  const indexPIP = useRef<THREE.Group>(null);
  const indexDIP = useRef<THREE.Group>(null);

  const middleMCP = useRef<THREE.Group>(null);
  const middlePIP = useRef<THREE.Group>(null);
  const middleDIP = useRef<THREE.Group>(null);

  const ringMCP = useRef<THREE.Group>(null);
  const ringPIP = useRef<THREE.Group>(null);
  const ringDIP = useRef<THREE.Group>(null);

  const pinkyMCP = useRef<THREE.Group>(null);
  const pinkyPIP = useRef<THREE.Group>(null);
  const pinkyDIP = useRef<THREE.Group>(null);

  const thumbMCP = useRef<THREE.Group>(null);
  const thumbPIP = useRef<THREE.Group>(null);

  // Complementary filter state persistent across frames
  const filterState = useRef({
    pitch: 0,
    roll: 0,
    yaw: 0,
    initialized: false,
  });

  // Mirrored X multiplier for left hand
  const sideX = side === 'lh' ? -1 : 1;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const { f1, f2, f3, f4, ax, ay, az, gx, gy, gz } = gloveState;

    // 1. MAP flex sensors to finger curling
    // f1 -> Index, f2 -> Middle, f3 -> Ring, f4 -> Pinky
    // Range: 0 - 4095 maps to 0 - Math.PI * 0.9
    const maxCurl = Math.PI * 0.9;
    const targetIndex = (Math.max(0, Math.min(4095, f1)) / 4095) * maxCurl;
    const targetMiddle = (Math.max(0, Math.min(4095, f2)) / 4095) * maxCurl;
    const targetRing = (Math.max(0, Math.min(4095, f3)) / 4095) * maxCurl;
    const targetPinky = (Math.max(0, Math.min(4095, f4)) / 4095) * maxCurl;

    // Distribute joint curling anatomically: MCP ~45%, PIP ~35%, DIP ~20%
    const lerpJoint = (ref: React.RefObject<THREE.Group>, target: number) => {
      if (ref.current) {
        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, target, 0.2);
      }
    };

    lerpJoint(indexMCP, targetIndex * 0.45);
    lerpJoint(indexPIP, targetIndex * 0.35);
    lerpJoint(indexDIP, targetIndex * 0.20);

    lerpJoint(middleMCP, targetMiddle * 0.45);
    lerpJoint(middlePIP, targetMiddle * 0.35);
    lerpJoint(middleDIP, targetMiddle * 0.20);

    lerpJoint(ringMCP, targetRing * 0.45);
    lerpJoint(ringPIP, targetRing * 0.35);
    lerpJoint(ringDIP, targetRing * 0.20);

    lerpJoint(pinkyMCP, targetPinky * 0.45);
    lerpJoint(pinkyPIP, targetPinky * 0.35);
    lerpJoint(pinkyDIP, targetPinky * 0.20);

    // Subtle natural thumb resting curl
    const thumbCurl = (targetIndex * 0.3 + targetMiddle * 0.2);
    lerpJoint(thumbMCP, thumbCurl * 0.4);
    lerpJoint(thumbPIP, thumbCurl * 0.3);

    // 2. MAP IMU to hand.rotation using Complementary Filter (alpha = 0.98)
    const hasIMUData = (ax !== 0 || ay !== 0 || az !== 0 || gx !== 0 || gy !== 0 || gz !== 0);

    if (hasIMUData && handGroup.current) {
      // Accelerometer pitch & roll
      const pitchAcc = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));
      const rollAcc = Math.atan2(ay, az);

      // Gyroscope angular rates in rad/s (firmware outputs deg/s)
      const gxRad = (gx * Math.PI) / 180;
      const gyRad = (gy * Math.PI) / 180;
      const gzRad = (gz * Math.PI) / 180;

      if (!filterState.current.initialized) {
        filterState.current.pitch = pitchAcc;
        filterState.current.roll = rollAcc;
        filterState.current.yaw = 0;
        filterState.current.initialized = true;
      }

      // Complementary filter: alpha * (integrated_gyro) + (1 - alpha) * (accel)
      const alpha = 0.98;
      const newPitch = alpha * (filterState.current.pitch + gxRad * dt) + (1 - alpha) * pitchAcc;
      const newRoll = alpha * (filterState.current.roll + gyRad * dt) + (1 - alpha) * rollAcc;
      const newYaw = (filterState.current.yaw + gzRad * dt) * 0.998; // gentle zero-centering

      filterState.current.pitch = newPitch;
      filterState.current.roll = newRoll;
      filterState.current.yaw = newYaw;

      // Smoothly apply fused orientation to hand group
      handGroup.current.rotation.x = THREE.MathUtils.lerp(handGroup.current.rotation.x, newPitch, 0.2);
      handGroup.current.rotation.y = THREE.MathUtils.lerp(handGroup.current.rotation.y, newYaw, 0.2);
      handGroup.current.rotation.z = THREE.MathUtils.lerp(handGroup.current.rotation.z, newRoll, 0.2);
    } else if (handGroup.current) {
      // Gentle subtle breathing float when idle
      const time = performance.now() * 0.001;
      const idlePitch = Math.sin(time * 0.8) * 0.03;
      const idleYaw = Math.cos(time * 0.5) * 0.04;
      handGroup.current.rotation.x = THREE.MathUtils.lerp(handGroup.current.rotation.x, idlePitch, 0.05);
      handGroup.current.rotation.y = THREE.MathUtils.lerp(handGroup.current.rotation.y, idleYaw, 0.05);
      handGroup.current.rotation.z = THREE.MathUtils.lerp(handGroup.current.rotation.z, 0, 0.05);
    }
  });

  return (
    <group ref={handGroup} position={[0, -0.6, 0]}>
      {/* ---------------- PALM ---------------- */}
      <group position={[0, 0, 0]}>
        {/* Main Central Palm Chassis */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.5, 1.7, 0.32]} />
          <meshStandardMaterial
            color={isHit ? '#ffeedd' : '#1d222d'}
            emissive={isHit ? '#ffb46b' : '#35c3ff'}
            emissiveIntensity={isHit ? 2.5 : 0.06}
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>

        {/* Cyber Dorsal Shield / Cover Plate */}
        <mesh position={[0, 0.05, 0.18]}>
          <boxGeometry args={[1.3, 1.4, 0.06]} />
          <meshStandardMaterial
            color={isHit ? '#ffb46b' : '#282e3d'}
            emissive={isHit ? '#ffb46b' : '#35c3ff'}
            emissiveIntensity={isHit ? 2.0 : 0.12}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Luminous Core Emblem / LED Ring */}
        <mesh position={[0, 0.1, 0.22]}>
          <ringGeometry args={[0.18, 0.26, 24]} />
          <meshBasicMaterial color={isHit ? '#ffb46b' : '#7af0c4'} side={THREE.DoubleSide} />
        </mesh>

        {/* Wrist Base / Glove Cuff */}
        <mesh position={[0, -1.0, 0]}>
          <cylinderGeometry args={[0.72, 0.8, 0.45, 16]} />
          <meshStandardMaterial
            color={isHit ? '#ffeedd' : '#181b22'}
            emissive={isHit ? '#ffb46b' : '#35c3ff'}
            emissiveIntensity={isHit ? 2.0 : 0.05}
            metalness={0.85}
            roughness={0.3}
          />
        </mesh>

        {/* Wrist Cyber Circuit Glow Line */}
        <mesh position={[0, -1.0, 0.41]}>
          <boxGeometry args={[1.1, 0.05, 0.02]} />
          <meshBasicMaterial color={isHit ? '#ffb46b' : '#35c3ff'} />
        </mesh>
      </group>

      {/* ---------------- THUMB ---------------- */}
      <group
        position={[-0.82 * sideX, -0.25, 0.08]}
        rotation={[0.3, -0.45 * sideX, 0.7 * sideX]}
      >
        <group ref={thumbMCP}>
          <FingerSegment length={0.52} radius={0.16} isHit={isHit}>
            <group ref={thumbPIP}>
              <FingerSegment length={0.42} radius={0.14} isHit={isHit}>
                {/* Thumb tip */}
                <mesh position={[0, 0.42, 0]}>
                  <sphereGeometry args={[0.13, 12, 12]} />
                  <meshBasicMaterial color={isHit ? '#ffb46b' : '#7af0c4'} />
                </mesh>
              </FingerSegment>
            </group>
          </FingerSegment>
        </group>
      </group>

      {/* ---------------- INDEX FINGER (F1) ---------------- */}
      <group position={[-0.52 * sideX, 0.88, 0]}>
        <group ref={indexMCP}>
          <FingerSegment length={0.62} radius={0.135} isHit={isHit}>
            <group ref={indexPIP}>
              <FingerSegment length={0.48} radius={0.12} isHit={isHit}>
                <group ref={indexDIP}>
                  <FingerSegment length={0.38} radius={0.105} isHit={isHit}>
                    {/* Fingertip Sensor Dome */}
                    <mesh position={[0, 0.38, 0]}>
                      <sphereGeometry args={[0.10, 12, 12]} />
                      <meshBasicMaterial color={isHit ? '#ffb46b' : '#35c3ff'} />
                    </mesh>
                  </FingerSegment>
                </group>
              </FingerSegment>
            </group>
          </FingerSegment>
        </group>
      </group>

      {/* ---------------- MIDDLE FINGER (F2) ---------------- */}
      <group position={[-0.17 * sideX, 0.95, 0]}>
        <group ref={middleMCP}>
          <FingerSegment length={0.70} radius={0.14} isHit={isHit}>
            <group ref={middlePIP}>
              <FingerSegment length={0.52} radius={0.125} isHit={isHit}>
                <group ref={middleDIP}>
                  <FingerSegment length={0.40} radius={0.11} isHit={isHit}>
                    {/* Fingertip Sensor Dome */}
                    <mesh position={[0, 0.40, 0]}>
                      <sphereGeometry args={[0.105, 12, 12]} />
                      <meshBasicMaterial color={isHit ? '#ffb46b' : '#35c3ff'} />
                    </mesh>
                  </FingerSegment>
                </group>
              </FingerSegment>
            </group>
          </FingerSegment>
        </group>
      </group>

      {/* ---------------- RING FINGER (F3) ---------------- */}
      <group position={[0.18 * sideX, 0.91, 0]}>
        <group ref={ringMCP}>
          <FingerSegment length={0.64} radius={0.135} isHit={isHit}>
            <group ref={ringPIP}>
              <FingerSegment length={0.48} radius={0.12} isHit={isHit}>
                <group ref={ringDIP}>
                  <FingerSegment length={0.38} radius={0.105} isHit={isHit}>
                    {/* Fingertip Sensor Dome */}
                    <mesh position={[0, 0.38, 0]}>
                      <sphereGeometry args={[0.10, 12, 12]} />
                      <meshBasicMaterial color={isHit ? '#ffb46b' : '#35c3ff'} />
                    </mesh>
                  </FingerSegment>
                </group>
              </FingerSegment>
            </group>
          </FingerSegment>
        </group>
      </group>

      {/* ---------------- PINKY FINGER (F4) ---------------- */}
      <group position={[0.53 * sideX, 0.81, 0]}>
        <group ref={pinkyMCP}>
          <FingerSegment length={0.50} radius={0.12} isHit={isHit}>
            <group ref={pinkyPIP}>
              <FingerSegment length={0.38} radius={0.11} isHit={isHit}>
                <group ref={pinkyDIP}>
                  <FingerSegment length={0.32} radius={0.095} isHit={isHit}>
                    {/* Fingertip Sensor Dome */}
                    <mesh position={[0, 0.32, 0]}>
                      <sphereGeometry args={[0.09, 12, 12]} />
                      <meshBasicMaterial color={isHit ? '#ffb46b' : '#35c3ff'} />
                    </mesh>
                  </FingerSegment>
                </group>
              </FingerSegment>
            </group>
          </FingerSegment>
        </group>
      </group>
    </group>
  );
};

// Main Exported Canvas Wrapper Component
export interface Hand3DProps {
  side?: 'rh' | 'lh';
}

export const Hand3D: React.FC<Hand3DProps> = ({ side = 'rh' }) => {
  return (
    <div className="relative w-full h-full min-h-[440px] flex items-center justify-center bg-gradient-to-b from-[#15171c] via-[#121418] to-[#0c0d10] overflow-hidden rounded-2xl border border-cyber-border">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.2, 5.2], fov: 45 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Lights */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 8, 5]} intensity={1.4} color="#eef6ff" />
        <directionalLight position={[-6, -4, -4]} intensity={0.8} color="#35c3ff" />
        <pointLight position={[0, 0, 3]} intensity={0.6} color="#7af0c4" distance={8} />

        {/* The 3D Hand Model */}
        <HandModel side={side} />

        {/* Cyberpunk Grid Floor */}
        <Grid
          position={[0, -2.4, 0]}
          args={[14, 14]}
          cellSize={0.5}
          cellThickness={0.8}
          cellColor="#252a36"
          sectionSize={2.0}
          sectionThickness={1.2}
          sectionColor="#35c3ff"
          fadeDistance={10}
          fadeStrength={1.5}
        />

        {/* Orbit Controls */}
        <OrbitControls
          enableRotate={true}
          enableZoom={true}
          enablePan={true}
          minDistance={2.5}
          maxDistance={12}
          maxPolarAngle={Math.PI / 2 + 0.15}
        />
      </Canvas>

      {/* Orbit Controls Instruction Badge */}
      <div className="absolute bottom-3 left-4 text-[11px] font-mono text-cyber-textMuted/70 bg-[#15171c]/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-cyber-border pointer-events-none">
        DRAG: Rotate • SCROLL: Zoom • RIGHT-CLICK: Pan
      </div>
    </div>
  );
};

export default Hand3D;
