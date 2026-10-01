import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGloveStore } from '../store/useGloveStore';

// -------------------------------------------------------------
// REALISTIC ANATOMICAL PROCEDURAL SEGMENT (High-Fidelity Organic Fallback)
// -------------------------------------------------------------
interface AnatomicalSegmentProps {
  length: number;
  radiusBase: number;
  radiusTip: number;
  isHit: boolean;
  skinColor?: string;
  hasNail?: boolean;
  children?: React.ReactNode;
}

const AnatomicalSegment: React.FC<AnatomicalSegmentProps> = ({
  length,
  radiusBase,
  radiusTip,
  isHit,
  skinColor = '#dfb19e',
  hasNail = false,
  children,
}) => {
  return (
    <group>
      {/* Phalanx Flesh Body */}
      <mesh position={[0, length / 2, 0]}>
        <cylinderGeometry args={[radiusTip, radiusBase, length, 24, 4]} />
        <meshStandardMaterial
          color={isHit ? '#fff3e0' : skinColor}
          emissive={isHit ? '#ffb46b' : '#3d1c14'}
          emissiveIntensity={isHit ? 2.8 : 0.05}
          roughness={0.42}
          metalness={0.05}
        />
      </mesh>

      {/* Articulated Knuckle Capsule */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[radiusBase * 1.08, 20, 20]} />
        <meshStandardMaterial
          color={isHit ? '#ffcc80' : '#cf9e8c'}
          emissive={isHit ? '#ffb46b' : '#4a2016'}
          emissiveIntensity={isHit ? 2.5 : 0.06}
          roughness={0.48}
          metalness={0.04}
        />
      </mesh>

      {/* Subtle Fingernail Detail on Tip */}
      {hasNail && (
        <mesh position={[0, length * 0.88, radiusTip * 0.72]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[radiusTip * 1.35, length * 0.35, radiusTip * 0.2]} />
          <meshStandardMaterial
            color={isHit ? '#ffffff' : '#f5e4dc'}
            emissive={isHit ? '#ffb46b' : '#000000'}
            emissiveIntensity={isHit ? 1.5 : 0}
            roughness={0.2}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* Child Phalanx Container */}
      <group position={[0, length, 0]}>{children}</group>
    </group>
  );
};

// -------------------------------------------------------------
// PROCEDURAL ANATOMICAL HAND HIERARCHY
// -------------------------------------------------------------
interface HandRigProps {
  side: 'rh' | 'lh';
  isHit: boolean;
}

const ProceduralHand: React.FC<HandRigProps> = ({ side, isHit }) => {
  const gloveState = useGloveStore((s) => s[side]);
  const handGroup = useRef<THREE.Group>(null);

  // Joints refs: MCP, PIP, DIP
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

  const thumbCMC = useRef<THREE.Group>(null);
  const thumbMCP = useRef<THREE.Group>(null);
  const thumbIP = useRef<THREE.Group>(null);

  // IMU filter state (alpha = 0.98)
  const filterState = useRef({
    pitch: 0,
    roll: 0,
    yaw: 0,
    initialized: false,
  });

  const sideX = side === 'lh' ? -1 : 1;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const { connected, f1, f2, f3, f4, ax, ay, az, gx, gy, gz } = gloveState;
    const time = performance.now() * 0.001;

    // 1. Calculate Target Curl for each finger (0 to ~100 degrees in radians)
    const maxCurl = Math.PI * 0.65;
    let tIndex = (Math.max(0, Math.min(4095, f1)) / 4095) * maxCurl;
    let tMiddle = (Math.max(0, Math.min(4095, f2)) / 4095) * maxCurl;
    let tRing = (Math.max(0, Math.min(4095, f3)) / 4095) * maxCurl;
    let tPinky = (Math.max(0, Math.min(4095, f4)) / 4095) * maxCurl;

    // Subtle natural breathing / idle micro-curls if disconnected
    if (!connected || (f1 === 0 && f2 === 0 && f3 === 0 && f4 === 0)) {
      const breath = Math.sin(time * 1.5) * 0.06 + 0.14;
      tIndex = breath * 1.05;
      tMiddle = breath * 1.25;
      tRing = breath * 1.2;
      tPinky = breath * 0.95;
    }

    // Anatomical flexion distribution: MCP 45%, PIP 35%, DIP 20%
    const lerpJoint = (ref: React.RefObject<THREE.Group>, target: number, speed: number = 0.22) => {
      if (ref.current) {
        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, target, speed);
      }
    };

    lerpJoint(indexMCP, tIndex * 0.45);
    lerpJoint(indexPIP, tIndex * 0.35);
    lerpJoint(indexDIP, tIndex * 0.20);

    lerpJoint(middleMCP, tMiddle * 0.45);
    lerpJoint(middlePIP, tMiddle * 0.35);
    lerpJoint(middleDIP, tMiddle * 0.20);

    lerpJoint(ringMCP, tRing * 0.45);
    lerpJoint(ringPIP, tRing * 0.35);
    lerpJoint(ringDIP, tRing * 0.20);

    lerpJoint(pinkyMCP, tPinky * 0.45);
    lerpJoint(pinkyPIP, tPinky * 0.35);
    lerpJoint(pinkyDIP, tPinky * 0.20);

    // Natural thumb flexion and opposition
    const thumbTarget = (tIndex * 0.35 + tMiddle * 0.25);
    lerpJoint(thumbCMC, thumbTarget * 0.3);
    lerpJoint(thumbMCP, thumbTarget * 0.4);
    lerpJoint(thumbIP, thumbTarget * 0.3);

    // 2. IMU Complementary Filter (alpha = 0.98)
    const hasIMUData = (ax !== 0 || ay !== 0 || az !== 0 || gx !== 0 || gy !== 0 || gz !== 0);

    if (hasIMUData && handGroup.current && connected) {
      const pitchAcc = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));
      const rollAcc = Math.atan2(ay, az);

      const gxRad = (gx * Math.PI) / 180;
      const gyRad = (gy * Math.PI) / 180;
      const gzRad = (gz * Math.PI) / 180;

      if (!filterState.current.initialized) {
        filterState.current.pitch = pitchAcc;
        filterState.current.roll = rollAcc;
        filterState.current.yaw = 0;
        filterState.current.initialized = true;
      }

      const alpha = 0.98;
      const newPitch = alpha * (filterState.current.pitch + gxRad * dt) + (1 - alpha) * pitchAcc;
      const newRoll = alpha * (filterState.current.roll + gyRad * dt) + (1 - alpha) * rollAcc;
      const newYaw = (filterState.current.yaw + gzRad * dt) * 0.998;

      filterState.current.pitch = newPitch;
      filterState.current.roll = newRoll;
      filterState.current.yaw = newYaw;

      handGroup.current.rotation.x = THREE.MathUtils.lerp(handGroup.current.rotation.x, newPitch, 0.2);
      handGroup.current.rotation.y = THREE.MathUtils.lerp(handGroup.current.rotation.y, newYaw, 0.2);
      handGroup.current.rotation.z = THREE.MathUtils.lerp(handGroup.current.rotation.z, newRoll, 0.2);
      handGroup.current.position.y = -0.4;
    } else if (handGroup.current) {
      // Idle floating motion
      const idlePitch = Math.sin(time * 0.6) * 0.05;
      const idleYaw = Math.cos(time * 0.5) * 0.07;
      const idleRoll = Math.sin(time * 0.4) * 0.03;
      const idleFloat = -0.4 + Math.sin(time * 1.1) * 0.05;

      handGroup.current.rotation.x = THREE.MathUtils.lerp(handGroup.current.rotation.x, idlePitch, 0.05);
      handGroup.current.rotation.y = THREE.MathUtils.lerp(handGroup.current.rotation.y, idleYaw, 0.05);
      handGroup.current.rotation.z = THREE.MathUtils.lerp(handGroup.current.rotation.z, idleRoll, 0.05);
      handGroup.current.position.y = THREE.MathUtils.lerp(handGroup.current.position.y, idleFloat, 0.05);
    }
  });

  return (
    <group ref={handGroup} position={[0, -0.4, 0]}>
      {/* ---------------- PALM STRUCTURE ---------------- */}
      <group position={[0, 0, 0]}>
        {/* Metacarpal Main Body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.5, 1.8, 0.38]} />
          <meshStandardMaterial
            color={isHit ? '#fff3e0' : '#dfb19e'}
            emissive={isHit ? '#ffb46b' : '#4a2016'}
            emissiveIntensity={isHit ? 2.8 : 0.05}
            roughness={0.42}
            metalness={0.04}
          />
        </mesh>

        {/* Thenar Muscle (Thumb Base) */}
        <mesh position={[-0.52 * sideX, -0.28, 0.1]} rotation={[0, 0, -0.25 * sideX]}>
          <sphereGeometry args={[0.42, 20, 20]} />
          <meshStandardMaterial
            color={isHit ? '#fff3e0' : '#e2b5a2'}
            emissive={isHit ? '#ffb46b' : '#4a2016'}
            emissiveIntensity={isHit ? 2.5 : 0.06}
            roughness={0.45}
            metalness={0.04}
          />
        </mesh>

        {/* Hypothenar Contour (Pinky Side) */}
        <mesh position={[0.58 * sideX, -0.2, 0.06]}>
          <cylinderGeometry args={[0.26, 0.34, 1.0, 16]} />
          <meshStandardMaterial
            color={isHit ? '#fff3e0' : '#d8a794'}
            emissive={isHit ? '#ffb46b' : '#3d1c14'}
            emissiveIntensity={isHit ? 2.5 : 0.05}
            roughness={0.44}
            metalness={0.04}
          />
        </mesh>

        {/* Dorsal Glove Telemetry Sensor Band (Smart Glove Hardware) */}
        <mesh position={[0, 0.08, 0.22]}>
          <boxGeometry args={[1.32, 1.45, 0.08]} />
          <meshStandardMaterial
            color="#181c24"
            emissive={isHit ? '#ffb46b' : '#d4a373'}
            emissiveIntensity={isHit ? 2.5 : 0.12}
            metalness={0.88}
            roughness={0.25}
          />
        </mesh>

        {/* Smart Drum Glove Sensor Hub / LED */}
        <mesh position={[0, 0.2, 0.28]}>
          <circleGeometry args={[0.18, 24]} />
          <meshStandardMaterial
            color={isHit ? '#ffffff' : '#d4a373'}
            emissive={isHit ? '#ffb46b' : '#d4a373'}
            emissiveIntensity={isHit ? 3.5 : 0.8}
            roughness={0.1}
          />
        </mesh>

        {/* Wrist Base / Glove Cuff */}
        <mesh position={[0, -1.1, 0]}>
          <cylinderGeometry args={[0.76, 0.85, 0.6, 24]} />
          <meshStandardMaterial
            color="#151820"
            emissive={isHit ? '#ffb46b' : '#222733'}
            emissiveIntensity={isHit ? 1.5 : 0.05}
            metalness={0.85}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* ---------------- THUMB (3 Segments) ---------------- */}
      <group
        position={[-0.82 * sideX, -0.22, 0.12]}
        rotation={[0.35, -0.45 * sideX, 0.65 * sideX]}
      >
        <group ref={thumbCMC}>
          <AnatomicalSegment length={0.52} radiusBase={0.18} radiusTip={0.16} isHit={isHit}>
            <group ref={thumbMCP}>
              <AnatomicalSegment length={0.45} radiusBase={0.16} radiusTip={0.14} isHit={isHit}>
                <group ref={thumbIP}>
                  <AnatomicalSegment length={0.38} radiusBase={0.14} radiusTip={0.12} isHit={isHit} hasNail={true} />
                </group>
              </AnatomicalSegment>
            </group>
          </AnatomicalSegment>
        </group>
      </group>

      {/* ---------------- INDEX FINGER (F1) ---------------- */}
      <group position={[-0.52 * sideX, 0.9, 0]}>
        <group ref={indexMCP}>
          <AnatomicalSegment length={0.65} radiusBase={0.16} radiusTip={0.145} isHit={isHit}>
            <group ref={indexPIP}>
              <AnatomicalSegment length={0.48} radiusBase={0.145} radiusTip={0.13} isHit={isHit}>
                <group ref={indexDIP}>
                  <AnatomicalSegment length={0.36} radiusBase={0.13} radiusTip={0.11} isHit={isHit} hasNail={true} />
                </group>
              </AnatomicalSegment>
            </group>
          </AnatomicalSegment>
        </group>
      </group>

      {/* ---------------- MIDDLE FINGER (F2) ---------------- */}
      <group position={[-0.17 * sideX, 0.95, 0]}>
        <group ref={middleMCP}>
          <AnatomicalSegment length={0.72} radiusBase={0.165} radiusTip={0.15} isHit={isHit}>
            <group ref={middlePIP}>
              <AnatomicalSegment length={0.54} radiusBase={0.15} radiusTip={0.135} isHit={isHit}>
                <group ref={middleDIP}>
                  <AnatomicalSegment length={0.38} radiusBase={0.135} radiusTip={0.115} isHit={isHit} hasNail={true} />
                </group>
              </AnatomicalSegment>
            </group>
          </AnatomicalSegment>
        </group>
      </group>

      {/* ---------------- RING FINGER (F3) ---------------- */}
      <group position={[0.18 * sideX, 0.9, 0]}>
        <group ref={ringMCP}>
          <AnatomicalSegment length={0.64} radiusBase={0.155} radiusTip={0.14} isHit={isHit}>
            <group ref={ringPIP}>
              <AnatomicalSegment length={0.48} radiusBase={0.14} radiusTip={0.125} isHit={isHit}>
                <group ref={ringDIP}>
                  <AnatomicalSegment length={0.34} radiusBase={0.125} radiusTip={0.105} isHit={isHit} hasNail={true} />
                </group>
              </AnatomicalSegment>
            </group>
          </AnatomicalSegment>
        </group>
      </group>

      {/* ---------------- PINKY FINGER (F4) ---------------- */}
      <group position={[0.52 * sideX, 0.82, 0]}>
        <group ref={pinkyMCP}>
          <AnatomicalSegment length={0.52} radiusBase={0.14} radiusTip={0.125} isHit={isHit}>
            <group ref={pinkyPIP}>
              <AnatomicalSegment length={0.38} radiusBase={0.125} radiusTip={0.11} isHit={isHit}>
                <group ref={pinkyDIP}>
                  <AnatomicalSegment length={0.3} radiusBase={0.11} radiusTip={0.095} isHit={isHit} hasNail={true} />
                </group>
              </AnatomicalSegment>
            </group>
          </AnatomicalSegment>
        </group>
      </group>
    </group>
  );
};

// -------------------------------------------------------------
// RIGGED GLTF SKINNED MESH HAND MODEL (WebXR Generic Anatomical Mesh)
// -------------------------------------------------------------
const RiggedGLTFHand: React.FC<HandRigProps> = ({ side, isHit }) => {
  const modelUrl = side === 'lh' ? '/models/hand/left.glb' : '/models/hand/right.glb';
  const gltf = useGLTF(modelUrl);
  const gloveState = useGloveStore((s) => s[side]);
  const rootRef = useRef<THREE.Group>(null);

  // Clone scene with skeleton intact
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    return clone;
  }, [gltf.scene]);

  // Skin material with subsurface scattering / tone & micro-roughness
  const skinMaterial = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(isHit ? '#ffffff' : '#dfb19e'),
      emissive: new THREE.Color(isHit ? '#ffb46b' : '#32140e'),
      emissiveIntensity: isHit ? 3.6 : 0.08,
      roughness: 0.44,
      metalness: 0.03,
      clearcoat: 0.1,
      clearcoatRoughness: 0.35,
      sheen: 0.75,
      sheenRoughness: 0.3,
      sheenColor: new THREE.Color(isHit ? '#ffe0b2' : '#f5b59a'),
      reflectivity: 0.3,
      side: THREE.DoubleSide,
    });

    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        // Subsurface scattering translucency approximation: warm fleshy tint in shadows
        vec3 sssTint = vec3(0.85, 0.32, 0.2) * 0.12 * (1.0 - clamp(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0));
        gl_FragColor.rgb += sssTint;
        #include <dithering_fragment>
        `
      );
    };

    return mat;
  }, [isHit]);

  // Find all anatomical bones in the rigged skeleton
  const bonesMap = useMemo(() => {
    const map: Record<string, THREE.Bone> = {};
    clonedScene.traverse((obj) => {
      if ((obj as THREE.Bone).isBone || obj.name.includes('phalanx') || obj.name.includes('metacarpal') || obj.name === 'wrist') {
        map[obj.name] = obj as THREE.Bone;
      }
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
        (obj as THREE.SkinnedMesh).material = skinMaterial;
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return map;
  }, [clonedScene, skinMaterial]);

  // Store rest rotations
  const restQuats = useMemo(() => {
    const quats: Record<string, THREE.Quaternion> = {};
    Object.entries(bonesMap).forEach(([name, bone]) => {
      quats[name] = bone.quaternion.clone();
    });
    return quats;
  }, [bonesMap]);

  // Filter state for IMU fusion
  const filterState = useRef({
    pitch: 0,
    roll: 0,
    yaw: 0,
    initialized: false,
  });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const { connected, f1, f2, f3, f4, ax, ay, az, gx, gy, gz } = gloveState;
    const time = performance.now() * 0.001;

    // 1. Calculate Target Curl for each finger (radians)
    const maxCurl = 1.35;
    let tIndex = (Math.max(0, Math.min(4095, f1)) / 4095) * maxCurl;
    let tMiddle = (Math.max(0, Math.min(4095, f2)) / 4095) * maxCurl;
    let tRing = (Math.max(0, Math.min(4095, f3)) / 4095) * maxCurl;
    let tPinky = (Math.max(0, Math.min(4095, f4)) / 4095) * maxCurl;

    // Idle tendon micro-breathing oscillation when disconnected
    if (!connected || (f1 === 0 && f2 === 0 && f3 === 0 && f4 === 0)) {
      const breath = Math.sin(time * 1.5) * 0.08 + 0.18;
      const tendonOsc = Math.sin(time * 3.2) * 0.02;
      tIndex = (breath + tendonOsc) * 1.0;
      tMiddle = (breath + tendonOsc * 1.2) * 1.2;
      tRing = (breath + tendonOsc * 0.9) * 1.15;
      tPinky = (breath + tendonOsc * 0.7) * 0.9;
    }

    // Helper to rotate a bone along local X axis
    const applyCurl = (boneName: string, angle: number) => {
      const bone = bonesMap[boneName];
      const rest = restQuats[boneName];
      if (bone && rest) {
        const qCurl = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
        bone.quaternion.copy(rest).multiply(qCurl);
      }
    };

    // Distribute curl to MCP 45%, PIP 35%, DIP 20%
    applyCurl('index-finger-phalanx-proximal', tIndex * 0.45);
    applyCurl('index-finger-phalanx-intermediate', tIndex * 0.35);
    applyCurl('index-finger-phalanx-distal', tIndex * 0.20);

    applyCurl('middle-finger-phalanx-proximal', tMiddle * 0.45);
    applyCurl('middle-finger-phalanx-intermediate', tMiddle * 0.35);
    applyCurl('middle-finger-phalanx-distal', tMiddle * 0.20);

    applyCurl('ring-finger-phalanx-proximal', tRing * 0.45);
    applyCurl('ring-finger-phalanx-intermediate', tRing * 0.35);
    applyCurl('ring-finger-phalanx-distal', tRing * 0.20);

    applyCurl('pinky-finger-phalanx-proximal', tPinky * 0.45);
    applyCurl('pinky-finger-phalanx-intermediate', tPinky * 0.35);
    applyCurl('pinky-finger-phalanx-distal', tPinky * 0.20);

    // Anatomical thumb opposition & flex
    const thumbTarget = (tIndex * 0.35 + tMiddle * 0.25);
    applyCurl('thumb-metacarpal', thumbTarget * 0.25);
    applyCurl('thumb-phalanx-proximal', thumbTarget * 0.35);
    applyCurl('thumb-phalanx-distal', thumbTarget * 0.25);

    // 2. IMU Complementary Filter (alpha = 0.98)
    const hasIMUData = (ax !== 0 || ay !== 0 || az !== 0 || gx !== 0 || gy !== 0 || gz !== 0);

    if (hasIMUData && rootRef.current && connected) {
      const pitchAcc = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));
      const rollAcc = Math.atan2(ay, az);

      const gxRad = (gx * Math.PI) / 180;
      const gyRad = (gy * Math.PI) / 180;
      const gzRad = (gz * Math.PI) / 180;

      if (!filterState.current.initialized) {
        filterState.current.pitch = pitchAcc;
        filterState.current.roll = rollAcc;
        filterState.current.yaw = 0;
        filterState.current.initialized = true;
      }

      const alpha = 0.98;
      const newPitch = alpha * (filterState.current.pitch + gxRad * dt) + (1 - alpha) * pitchAcc;
      const newRoll = alpha * (filterState.current.roll + gyRad * dt) + (1 - alpha) * rollAcc;
      const newYaw = (filterState.current.yaw + gzRad * dt) * 0.998;

      filterState.current.pitch = newPitch;
      filterState.current.roll = newRoll;
      filterState.current.yaw = newYaw;

      rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, newPitch, 0.2);
      rootRef.current.rotation.y = THREE.MathUtils.lerp(rootRef.current.rotation.y, newYaw, 0.2);
      rootRef.current.rotation.z = THREE.MathUtils.lerp(rootRef.current.rotation.z, newRoll, 0.2);
      rootRef.current.position.y = -0.3;
    } else if (rootRef.current) {
      // Idle float
      const idlePitch = Math.sin(time * 0.6) * 0.05;
      const idleYaw = Math.cos(time * 0.5) * 0.07;
      const idleRoll = Math.sin(time * 0.4) * 0.03;
      const idleFloat = -0.3 + Math.sin(time * 1.1) * 0.04;

      rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, idlePitch, 0.05);
      rootRef.current.rotation.y = THREE.MathUtils.lerp(rootRef.current.rotation.y, idleYaw, 0.05);
      rootRef.current.rotation.z = THREE.MathUtils.lerp(rootRef.current.rotation.z, idleRoll, 0.05);
      rootRef.current.position.y = THREE.MathUtils.lerp(rootRef.current.position.y, idleFloat, 0.05);
    }
  });

  return (
    <group ref={rootRef} position={[0, -0.3, 0]} scale={12}>
      <primitive
        object={clonedScene}
        rotation={side === 'rh' ? [0, Math.PI / 2, Math.PI] : [0, -Math.PI / 2, Math.PI]}
      />
    </group>
  );
};

// -------------------------------------------------------------
// ERROR BOUNDARY & FALLBACK WRAPPER
// -------------------------------------------------------------
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// -------------------------------------------------------------
// MAIN REALISTIC HAND 3D VIEWPORT
// -------------------------------------------------------------
export interface RealisticHand3DProps {
  side?: 'rh' | 'lh';
  className?: string;
}

export const RealisticHand3D: React.FC<RealisticHand3DProps> = ({ side = 'rh', className = 'w-full h-full' }) => {
  const isHit = useGloveStore((s) => s.isHandFlashing);
  const [modelType, setModelType] = useState<'rigged' | 'procedural'>('rigged');

  return (
    <div className={`relative ${className}`}>
      {/* Top Model Switcher Ribbon */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[#12141a]/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-[10px] font-mono">
        <span className="text-studio-creamMuted mr-1">RIG:</span>
        <button
          onClick={() => setModelType('rigged')}
          className={`px-2 py-0.5 rounded transition-all ${
            modelType === 'rigged'
              ? 'bg-studio-gold text-black font-bold shadow-glowGold'
              : 'text-studio-creamMuted hover:text-white'
          }`}
        >
          GLTF BONES
        </button>
        <button
          onClick={() => setModelType('procedural')}
          className={`px-2 py-0.5 rounded transition-all ${
            modelType === 'procedural'
              ? 'bg-studio-gold text-black font-bold shadow-glowGold'
              : 'text-studio-creamMuted hover:text-white'
          }`}
        >
          ARTICULATED
        </button>
      </div>

      <Canvas
        camera={{ position: [0, 0.4, 3.8], fov: 42 }}
        shadows
        gl={{ antialias: true, alpha: true, toneMappingExposure: 1.15 }}
      >
        {/* Pro-Audio Studio Lighting */}
        <ambientLight intensity={0.45} />
        
        {/* Key Warm Studio Light */}
        <directionalLight
          position={[4, 6, 4]}
          intensity={1.4}
          color="#fff5eb"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        
        {/* Cyan/Blue Rim Light (Silhouette Accent) */}
        <directionalLight
          position={[-4, 3, -4]}
          intensity={1.1}
          color="#38bdf8"
        />

        {/* Bottom Fill Light */}
        <directionalLight position={[0, -4, 2]} intensity={0.25} color="#d4a373" />

        {/* Dynamic Amber Flash Light on Drum Strike */}
        {isHit && (
          <pointLight position={[0, 0, 1.5]} intensity={8.0} color="#ffb46b" distance={6} />
        )}

        {/* 3D Hand Model */}
        <ModelErrorBoundary fallback={<ProceduralHand side={side} isHit={isHit} />}>
          <Suspense fallback={<ProceduralHand side={side} isHit={isHit} />}>
            {modelType === 'rigged' ? (
              <RiggedGLTFHand side={side} isHit={isHit} />
            ) : (
              <ProceduralHand side={side} isHit={isHit} />
            )}
          </Suspense>
        </ModelErrorBoundary>

        {/* Soft Contact Shadows on Floor */}
        <ContactShadows
          position={[0, -1.8, 0]}
          opacity={0.65}
          scale={5}
          blur={2.4}
          far={4}
          color="#000000"
        />

        {/* Studio Floor Subtle Radial Grid */}
        <mesh position={[0, -1.81, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.8, 48]} />
          <meshBasicMaterial color="#12151d" transparent opacity={0.6} />
        </mesh>

        {/* Camera Orbit Controls */}
        <OrbitControls
          enableRotate={true}
          enableZoom={true}
          enablePan={false}
          minDistance={1.8}
          maxDistance={6.5}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
        />

        {/* Post-Processing Pipeline: Bloom & Chromatic Aberration */}
        <EffectComposer>
          <Bloom
            intensity={isHit ? 1.8 : 0.4}
            luminanceThreshold={0.82}
            luminanceSmoothing={0.3}
          />
          <ChromaticAberration
            offset={isHit ? new THREE.Vector2(0.003, 0.003) : new THREE.Vector2(0, 0)}
            radialModulation={true}
            modulationOffset={0.5}
          />
          <Vignette eskil={false} offset={0.15} darkness={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

useGLTF.preload('/models/hand/right.glb');
useGLTF.preload('/models/hand/left.glb');

export default RealisticHand3D;
