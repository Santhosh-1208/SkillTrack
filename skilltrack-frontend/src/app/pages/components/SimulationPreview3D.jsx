import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Helpers ─────────────────────────────────────────────────────── */
const lerp = (a, b, t) => a + (b - a) * Math.min(Math.max(t, 0), 1);
const smoothstep = (t) => t * t * (3 - 2 * t);
const phaseT = (elapsed, start, end) => smoothstep(Math.min(Math.max((elapsed - start) / (end - start), 0), 1));

function ParticleField({ count = 50, color = '#60a5fa', spread = 7, speed = 0.07 }) {
  const mesh = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * spread;
      arr[i * 3 + 1] = (Math.random() - 0.5) * spread;
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    return arr;
  }, [count, spread]);
  useFrame((_, d) => { if (mesh.current) mesh.current.rotation.y += d * speed; });
  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color={color} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function GridFloor({ color = '#1e40af', opacity = 0.5 }) {
  return <gridHelper args={[18, 18, color, color]} position={[0, -2.2, 0]} />;
}

/* ══════════════════════════════════════════════════════════════════
   PPE_COMPLIANCE_001
   Story: Items on rack → inspection glow → worker equips each item
          → checkpoint scanner approval → compliance badge
   Cycle: 28s
══════════════════════════════════════════════════════════════════ */
function PPEItem({ position, color, shape = 'box', label, glowing, visible = 1, onWorker = false }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.material.emissiveIntensity = glowing ? 0.3 + Math.sin(t * 4) * 0.3 : 0.05;
    ref.current.scale.setScalar(lerp(0, 1, visible));
  });
  const geo = shape === 'sphere' ? <sphereGeometry args={[0.22, 12, 12]} />
    : shape === 'torus' ? <torusGeometry args={[0.2, 0.07, 8, 24]} />
    : <boxGeometry args={[0.3, 0.2, 0.3]} />;
  return (
    <group position={position}>
      <mesh ref={ref}>
        {geo}
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} roughness={0.3} metalness={0.2} />
      </mesh>
    </group>
  );
}

function PPEWorker({ armoured }) {
  // body, head, hard hat — items snap on based on armoured bitmask
  return (
    <group>
      {/* Torso */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.38, 0.45, 1.1, 8]} />
        <meshStandardMaterial color={armoured >= 3 ? '#f97316' : '#6b7280'} roughness={0.5} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#fde68a" roughness={0.3} />
      </mesh>
      {/* Hard Hat */}
      {armoured >= 1 && (
        <group position={[0, 0.7, 0]}>
          <mesh>
            <cylinderGeometry args={[0.4, 0.36, 0.2, 16]} />
            <meshStandardMaterial color="#facc15" metalness={0.15} roughness={0.25} emissive="#facc15" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.06, 16]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
        </group>
      )}
      {/* Goggles */}
      {armoured >= 2 && (
        <mesh position={[0, 0.38, 0.3]}>
          <torusGeometry args={[0.15, 0.045, 6, 20]} />
          <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.1} emissive="#3b82f6" emissiveIntensity={0.4} />
        </mesh>
      )}
      {/* Vest stripes */}
      {armoured >= 3 && (
        <>
          <mesh position={[0, -0.2, 0.41]}>
            <boxGeometry args={[0.78, 0.09, 0.02]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[0, -0.42, 0.41]}>
            <boxGeometry args={[0.78, 0.09, 0.02]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.7} />
          </mesh>
        </>
      )}
      {/* Gloves */}
      {armoured >= 4 && (
        <>
          <mesh position={[-0.56, -0.55, 0]}>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0.56, -0.55, 0]}>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.4} />
          </mesh>
        </>
      )}
      {/* Boots */}
      {armoured >= 5 && (
        <>
          <mesh position={[-0.22, -1.0, 0.1]}>
            <boxGeometry args={[0.25, 0.18, 0.45]} />
            <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.6} />
          </mesh>
          <mesh position={[0.22, -1.0, 0.1]}>
            <boxGeometry args={[0.25, 0.18, 0.45]} />
            <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.6} />
          </mesh>
        </>
      )}
    </group>
  );
}

function CheckpointGate({ active }) {
  const lightRef = useRef();
  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.material.emissiveIntensity = active
        ? 0.5 + Math.sin(state.clock.elapsedTime * 6) * 0.5
        : 0.1;
      lightRef.current.material.color.set(active ? '#22c55e' : '#374151');
      lightRef.current.material.emissive.set(active ? '#22c55e' : '#374151');
    }
  });
  return (
    <group position={[0, -0.5, -2]}>
      <mesh position={[-1.0, 0, 0]}>
        <boxGeometry args={[0.12, 3, 0.12]} />
        <meshStandardMaterial color="#4b5563" metalness={0.7} />
      </mesh>
      <mesh position={[1.0, 0, 0]}>
        <boxGeometry args={[0.12, 3, 0.12]} />
        <meshStandardMaterial color="#4b5563" metalness={0.7} />
      </mesh>
      <mesh ref={lightRef} position={[0, 0.9, 0]}>
        <boxGeometry args={[2.0, 0.2, 0.2]} />
        <meshStandardMaterial color="#374151" emissive="#374151" emissiveIntensity={0.1} />
      </mesh>
    </group>
  );
}

function PPEScene() {
  const CYCLE = 28;
  const workerRef = useRef();
  const armRef = useRef(0);

  useFrame((state) => {
    const t = state.clock.elapsedTime % CYCLE;
    // Worker walk-in during equip phase
    if (workerRef.current) {
      const walkIn = phaseT(t, 8, 11);
      workerRef.current.position.z = lerp(3, 0, walkIn);
    }
    // Equip stages
    if (t < 10) armRef.current = 0;
    else if (t < 13) armRef.current = 1;
    else if (t < 15) armRef.current = 2;
    else if (t < 17) armRef.current = 3;
    else if (t < 19) armRef.current = 4;
    else armRef.current = 5;
  });

  const [, rerender] = useState(0);
  useFrame(() => rerender((n) => n ^ 1));

  const t = useRef(0);
  useFrame((state) => { t.current = state.clock.elapsedTime % CYCLE; });

  return (
    <>
      <color attach="background" args={['#0f1e0f']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 4]} intensity={1.1} color="#fff7ed" castShadow />
      <pointLight position={[0, 3, 1]} intensity={0.8} color="#22c55e" />
      <pointLight position={[-3, 2, 2]} intensity={0.5} color="#facc15" />

      {/* PPE Rack */}
      <mesh position={[0, -1.6, -3.5]}>
        <boxGeometry args={[5, 0.1, 0.5]} />
        <meshStandardMaterial color="#374151" metalness={0.6} />
      </mesh>

      {/* Items on rack — glow sequentially */}
      <PPEItem position={[-1.8, -1.1, -3.5]} color="#facc15" shape="sphere" glowing={t.current > 3 && t.current < 13} visible={t.current < 14 ? 1 : 0} />
      <PPEItem position={[-0.9, -1.2, -3.5]} color="#3b82f6" shape="torus" glowing={t.current > 5 && t.current < 15} visible={t.current < 16 ? 1 : 0} />
      <PPEItem position={[0, -1.2, -3.5]} color="#f97316" shape="box" glowing={t.current > 7 && t.current < 17} visible={t.current < 18 ? 1 : 0} />
      <PPEItem position={[0.9, -1.2, -3.5]} color="#22c55e" shape="sphere" glowing={t.current > 9 && t.current < 19} visible={t.current < 20 ? 1 : 0} />
      <PPEItem position={[1.8, -1.2, -3.5]} color="#1f2937" shape="box" glowing={t.current > 11 && t.current < 21} visible={t.current < 22 ? 1 : 0} />

      {/* Worker */}
      <group ref={workerRef} position={[0, 0, 3]}>
        <PPEWorker armoured={armRef.current} />
      </group>

      {/* Checkpoint gate */}
      <CheckpointGate active={t.current > 22 && t.current < 27} />

      {/* Phase label */}
      <PhaseLabel
        label={
          t.current < 5 ? '① Identify Required PPE' :
          t.current < 10 ? '② Inspect Items' :
          t.current < 20 ? '③ Equip PPE Correctly' :
          t.current < 25 ? '④ Checkpoint Clearance' :
          '✓ Compliance Confirmed'
        }
      />

      <ParticleField count={60} color="#facc15" spread={8} />
      <GridFloor color="#14532d" />
      <Stars radius={22} depth={10} count={300} factor={2} saturation={0} fade />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HAZARD_IDENT_002
   Story: Factory floor → sweeping scan line → hazards appear
          one-by-one → tagged → report compiled → cleared
   Cycle: 26s
══════════════════════════════════════════════════════════════════ */
function ScanLine() {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime % 26;
    if (t < 8) {
      ref.current.visible = true;
      ref.current.position.z = lerp(-5, 5, t / 8);
      ref.current.material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 8) * 0.3;
    } else {
      ref.current.visible = false;
    }
  });
  return (
    <mesh ref={ref} position={[0, -2.1, -5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 0.12]} />
      <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={1} transparent opacity={0.6} />
    </mesh>
  );
}

function HazardCone({ position, delay, label }) {
  const ref = useRef();
  const textRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime % 26;
    const visible = t > delay;
    const cleared = t > 20;
    if (ref.current) {
      const s = visible ? lerp(0, 1, (t - delay) * 2) : 0;
      ref.current.scale.setScalar(Math.min(s, 1));
      ref.current.children[0].material.color.set(cleared ? '#22c55e' : '#ef4444');
      ref.current.children[0].material.emissive.set(cleared ? '#22c55e' : '#ef4444');
      ref.current.children[0].material.emissiveIntensity = cleared
        ? 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3
        : 0.4 + Math.sin(state.clock.elapsedTime * 3 + delay) * 0.4;
    }
  });
  return (
    <group ref={ref} position={position} scale={0}>
      <mesh>
        <coneGeometry args={[0.32, 0.7, 3]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, -0.52, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.08, 3]} />
        <meshStandardMaterial color="#fca5a5" />
      </mesh>
    </group>
  );
}

function InspectorFigure() {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime % 26;
    if (!ref.current) return;
    // Inspector walks around inspecting hazards
    if (t > 6 && t < 20) {
      const progress = (t - 6) / 14;
      ref.current.position.x = Math.sin(progress * Math.PI * 2) * 2.5;
      ref.current.position.z = Math.cos(progress * Math.PI * 2) * 1.5;
      ref.current.rotation.y = Math.atan2(
        Math.cos(progress * Math.PI * 2),
        -Math.sin(progress * Math.PI * 2)
      );
      ref.current.visible = true;
    } else {
      ref.current.visible = false;
    }
  });
  return (
    <group ref={ref} position={[0, -1.2, 0]} visible={false}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.7, 8]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#fde68a" roughness={0.3} />
      </mesh>
      {/* Clipboard */}
      <mesh position={[0.28, 0.3, 0.1]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[0.2, 0.28, 0.03]} />
        <meshStandardMaterial color="#f9fafb" />
      </mesh>
    </group>
  );
}

function FactoryMachine({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.4, 1.2, 0.9]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.8, 8]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} />
      </mesh>
    </group>
  );
}

function HazardScene() {
  const t = useRef(0);
  useFrame((state) => { t.current = state.clock.elapsedTime % 26; });
  const [, r] = useState(0);
  useFrame(() => r(n => n + 1));

  return (
    <>
      <color attach="background" args={['#1a0a00']} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 9, 3]} intensity={1.0} color="#fef3c7" />
      <pointLight position={[0, 4, 0]} intensity={t.current > 8 ? 2.5 : 0.5} color="#ef4444" />
      <pointLight position={[-3, 2, 3]} intensity={0.5} color="#f97316" />
      <pointLight position={[3, 2, -2]} intensity={t.current > 20 ? 1.5 : 0.3} color="#22c55e" />

      <ScanLine />

      <FactoryMachine position={[-2.5, -1.6, -2]} />
      <FactoryMachine position={[2.5, -1.6, -1.5]} />

      {/* Chemical spill on floor */}
      <mesh position={[-0.5, -2.15, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 12]} />
        <meshStandardMaterial color="#a3e635" transparent opacity={0.6} roughness={1} />
      </mesh>

      <HazardCone position={[-1.2, -1.6, 1.0]} delay={4}  label="Chemical Spill" />
      <HazardCone position={[1.5,  -1.6, 0.5]} delay={7}  label="Slip Hazard" />
      <HazardCone position={[0,    -1.6, -1.5]} delay={11} label="Blocked Exit" />

      <InspectorFigure />

      <PhaseLabel
        label={
          t.current < 4  ? '① Area Scan Initiated' :
          t.current < 8  ? '② Hazard Found: Chemical Spill' :
          t.current < 12 ? '③ Hazard Found: Slip Zone' :
          t.current < 16 ? '④ Hazard Found: Blocked Exit' :
          t.current < 20 ? '⑤ Tagging & Logging Hazards' :
          '✓ Hazard Report Filed'
        }
      />

      <ParticleField count={55} color="#f97316" spread={9} />
      <GridFloor color="#451a03" />
      <Stars radius={22} depth={10} count={280} factor={2} saturation={0} fade />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LOTO_PROC_004
   Story: Machine running → power isolation → lockout applied
          → tag attached → safe verification → worker works safely
   Cycle: 28s
══════════════════════════════════════════════════════════════════ */
function SpinningGear({ running, speed = 1 }) {
  const ref = useRef();
  const targetSpeed = useRef(speed);
  useFrame((_, delta) => {
    if (!ref.current) return;
    targetSpeed.current = lerp(targetSpeed.current, running ? speed : 0, 0.03);
    ref.current.rotation.z += delta * targetSpeed.current;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.55, 0.12, 6, 12]} />
      <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

function PowerPanel({ isolated }) {
  const btnRef = useRef();
  useFrame((state) => {
    if (!btnRef.current) return;
    const color = isolated ? '#22c55e' : '#ef4444';
    btnRef.current.material.color.set(color);
    btnRef.current.material.emissive.set(color);
    btnRef.current.material.emissiveIntensity = isolated
      ? 0.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2
      : 0.6 + Math.sin(state.clock.elapsedTime * 4) * 0.4;
  });
  return (
    <group position={[2.5, -0.6, 0]}>
      <mesh>
        <boxGeometry args={[0.9, 1.4, 0.2]} />
        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Main switch */}
      <mesh ref={btnRef} position={[0, 0.3, 0.12]}>
        <boxGeometry args={[0.35, 0.35, 0.1]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} />
      </mesh>
      {/* Status label area */}
      <mesh position={[0, -0.25, 0.12]}>
        <boxGeometry args={[0.6, 0.3, 0.05]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  );
}

function FloatingPadlock({ visible, locked }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.visible = visible;
    const t = state.clock.elapsedTime;
    ref.current.position.y = -0.1 + Math.sin(t * 1.2) * 0.1;
    ref.current.rotation.y += 0.01;
    ref.current.children[0].material.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.2;
  });
  return (
    <group ref={ref} position={[-1.2, 0.4, 1.2]} visible={false}>
      {/* Body */}
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[0.55, 0.65, 0.25]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.2} emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      {/* Shackle */}
      <mesh position={[0, 0.28, 0]}>
        <torusGeometry args={[0.2, 0.065, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.85} roughness={0.1} />
      </mesh>
      {/* Tag */}
      {locked && (
        <mesh position={[0, -0.62, 0]} rotation={[0.2, 0, 0.15]}>
          <boxGeometry args={[0.35, 0.5, 0.03]} />
          <meshStandardMaterial color="#fde68a" roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

function LOTOScene() {
  const CYCLE = 28;
  const t = useRef(0);
  useFrame((state) => { t.current = state.clock.elapsedTime % CYCLE; });
  const [, r] = useState(0);
  useFrame(() => r(n => n + 1));

  const tc = t.current;
  const machineRunning = tc < 6;
  const isolated = tc >= 6;
  const lockVisible = tc >= 10;
  const tagVisible = tc >= 15;

  return (
    <>
      <color attach="background" args={['#0f1629']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 7, 4]} intensity={1.0} color="#dbeafe" />
      <pointLight position={[-1.5, 1, 0]} intensity={machineRunning ? 2 : 0.2} color="#f97316" />
      <pointLight position={[2.5, 2, 0]} intensity={isolated ? 1.5 : 0.3} color="#22c55e" />
      <pointLight position={[0, 3, 2]} intensity={0.6} color="#3b82f6" />

      {/* Machine body */}
      <group position={[-1.2, -1.0, 0]}>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[1.8, 1.8, 1.0]} />
          <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Running indicator light */}
        <mesh position={[0, 1.05, 0.5]}>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshStandardMaterial
            color={machineRunning ? '#ef4444' : '#22c55e'}
            emissive={machineRunning ? '#ef4444' : '#22c55e'}
            emissiveIntensity={0.9}
          />
        </mesh>
        {/* Gears */}
        <Float speed={0} floatIntensity={0}>
          <group position={[0, 0.35, 0.55]}>
            <SpinningGear running={machineRunning} speed={2.5} />
            <group position={[0.7, 0.4, 0]}>
              <SpinningGear running={machineRunning} speed={-1.8} />
            </group>
          </group>
        </Float>
        {/* Energy cables */}
        <mesh position={[0.9, 0, 0.3]} rotation={[0, 0, Math.PI / 6]}>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
          <meshStandardMaterial color={machineRunning ? '#f97316' : '#374151'} emissive={machineRunning ? '#f97316' : '#111827'} emissiveIntensity={machineRunning ? 0.6 : 0} />
        </mesh>
      </group>

      <PowerPanel isolated={isolated} />
      <FloatingPadlock visible={lockVisible} locked={tagVisible} />

      {/* Safe worker near machine when locked out */}
      {tc > 18 && (
        <group position={[-2.2, -1.6, 1.5]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.22, 0.26, 0.8, 8]} />
            <meshStandardMaterial color="#22c55e" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.82, 0]}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshStandardMaterial color="#fde68a" roughness={0.3} />
          </mesh>
        </group>
      )}

      <PhaseLabel
        label={
          tc < 4  ? '① Machine Operating Normally' :
          tc < 8  ? '② Initiating Energy Isolation' :
          tc < 12 ? '③ Applying Lockout Device' :
          tc < 17 ? '④ Attaching Danger Tag' :
          tc < 22 ? '⑤ Verifying Zero Energy State' :
          '✓ Machine Safely Locked Out'
        }
      />

      <ParticleField count={65} color="#60a5fa" spread={8} />
      <GridFloor color="#1e3a8a" />
      <Stars radius={22} depth={10} count={350} factor={2} saturation={0} fade />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FIRE_EVAC_003
   Story: Normal building → fire alarm sounds → fire grows
          → evacuation arrows activate → people evacuate
          → assembly point → all clear
   Cycle: 30s
══════════════════════════════════════════════════════════════════ */
function FireParticles({ active, position, intensity = 1 }) {
  const count = 50;
  const mesh = useRef();
  const velocities = useMemo(() => new Float32Array(count * 3).fill(0).map(() => (Math.random() - 0.5) * 0.02), []);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 0.8 * intensity;
      arr[i * 3 + 1] = Math.random() * 1.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.8 * intensity;
    }
    return arr;
  }, [intensity]);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.visible = active;
    if (!active) return;
    const posArr = mesh.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 1] += 0.018 + Math.random() * 0.01;
      posArr[i * 3]     += Math.sin(state.clock.elapsedTime * 3 + i) * 0.005;
      if (posArr[i * 3 + 1] > 2.0) {
        posArr[i * 3 + 1] = 0;
        posArr[i * 3]     = (Math.random() - 0.5) * 0.8 * intensity;
        posArr[i * 3 + 2] = (Math.random() - 0.5) * 0.8 * intensity;
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#f97316" transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

function AlarmLight({ position, active }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.material.emissiveIntensity = active ? 0.3 + Math.sin(state.clock.elapsedTime * 8) * 0.7 : 0.05;
    ref.current.material.opacity = active ? 1 : 0.3;
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.18, 10, 10]} />
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.05} transparent opacity={0.3} />
    </mesh>
  );
}

function EvacArrowSequence({ active }) {
  const refs = [useRef(), useRef(), useRef(), useRef()];
  useFrame((state) => {
    if (!active) { refs.forEach(r => { if (r.current) r.current.visible = false; }); return; }
    refs.forEach((r, i) => {
      if (!r.current) return;
      r.current.visible = true;
      r.current.material.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 4 - i * 0.8) * 0.6;
    });
  });
  const positions = [[-3.5, -0.8, 1], [-2.5, -0.8, 1], [-1.5, -0.8, 1], [-0.5, -0.8, 1]];
  return (
    <>
      {positions.map((pos, i) => (
        <mesh key={i} ref={refs[i]} position={pos} rotation={[0, 0, -Math.PI / 2]} visible={false}>
          <coneGeometry args={[0.2, 0.55, 4]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </>
  );
}

function EvacPerson({ position, active, delay = 0 }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.visible = active;
    if (!active) return;
    const t = (state.clock.elapsedTime - delay) * 0.5;
    ref.current.position.x = position[0] + Math.min(t, 3.5);
    ref.current.position.y = position[1] + Math.abs(Math.sin(t * 6)) * 0.08;
  });
  return (
    <group ref={ref} position={position} visible={false}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.6, 6]} />
        <meshStandardMaterial color="#f97316" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#fde68a" roughness={0.3} />
      </mesh>
    </group>
  );
}

function AssemblyZone({ visible }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.visible = visible;
    ref.current.material.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
  });
  return (
    <group visible={false}>
      <mesh ref={ref} position={[4, -2.18, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 24]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function SmokeCloud({ active }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const a = new Float32Array(60);
    for (let i = 0; i < 20; i++) {
      a[i*3]   = (Math.random() - 0.5) * 2.5;
      a[i*3+1] = 0.5 + Math.random() * 2.5;
      a[i*3+2] = (Math.random() - 0.5);
    }
    return a;
  }, []);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.material.opacity = active ? 0.3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1 : 0;
  });
  return (
    <points ref={ref} position={[0, -2.1, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={20} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.2} color="#9ca3af" transparent opacity={0} sizeAttenuation />
    </points>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FIRE_EVAC_003 - Fire Emergency Response Dashboard
   Story: 3D Grid Map showing live pulsing markers from MongoDB data
   Cycle: 30s
══════════════════════════════════════════════════════════════════ */
function PulsingMarker({ position, severity }) {
  const ref = useRef();
  const color = severity === 'high' ? '#ff3333' : '#f97316';
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.elapsedTime;
      const scale = 1 + Math.sin(t * 4) * 0.2;
      ref.current.scale.setScalar(scale);
      ref.current.material.emissiveIntensity = 0.5 + Math.sin(t * 8) * 0.5;
    }
  });
  return (
    <group position={position}>
      <mesh ref={ref} position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} />
        <pointLight distance={4} intensity={2} color={color} />
      </mesh>
      {/* Marker stem */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4]} />
        <meshStandardMaterial color="#aaaaaa" />
      </mesh>
    </group>
  );
}

function FireScene() {
  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <gridHelper args={[10, 10, '#444444', '#222222']} position={[0, 0, 0]} />
      
      <PulsingMarker position={[-2, 0, 1]} severity="high" />
      <PulsingMarker position={[1.5, 0, -2]} severity="medium" />
      <PulsingMarker position={[3, 0, 1.5]} severity="high" />
      <PulsingMarker position={[-1, 0, -3]} severity="medium" />
      
      {/* Central building proxy */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 2]} />
        <meshStandardMaterial color="#333333" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/* ─── Phase Label HUD ─────────────────────────────────────────────── */
function PhaseLabel({ label, urgent = false }) {
  // We render this as a DOM overlay instead of 3D Text for clarity
  return null; // handled by parent overlay div below
}

/* ─── Export wrapper with label overlay ─────────────────────────────── */
const SCENE_MAP = {
  PPE_COMPLIANCE_001: { Scene: PPEScene, cycle: 28 },
  HAZARD_IDENT_002:   { Scene: HazardScene, cycle: 26 },
  LOTO_PROC_004:      { Scene: LOTOScene, cycle: 28 },
  FIRE_EVAC_003:      { Scene: FireScene, cycle: 30 },
};

function PhaseTracker({ cycle, onPhase }) {
  useFrame((state) => {
    const t = state.clock.elapsedTime % cycle;
    onPhase(t);
  });
  return null;
}

export function SimulationPreview3D({ simulationId }) {
  const entry = SCENE_MAP[simulationId] || SCENE_MAP['PPE_COMPLIANCE_001'];
  const { Scene, cycle } = entry;

  const getLabel = (simId, t) => {
    if (simId === 'PPE_COMPLIANCE_001') {
      if (t < 5)  return '① Identify Required PPE';
      if (t < 10) return '② Inspect Each Item';
      if (t < 20) return '③ Equip PPE Correctly';
      if (t < 25) return '④ Checkpoint Clearance';
      return '✓ Compliance Confirmed';
    }
    if (simId === 'HAZARD_IDENT_002') {
      if (t < 4)  return '① Area Scan Initiated';
      if (t < 8)  return '② Hazard Found: Chemical Spill';
      if (t < 12) return '③ Hazard Found: Slip Zone';
      if (t < 16) return '④ Hazard Found: Blocked Exit';
      if (t < 20) return '⑤ Tagging & Logging';
      return '✓ Hazard Report Filed';
    }
    if (simId === 'LOTO_PROC_004') {
      if (t < 4)  return '① Machine Operating';
      if (t < 8)  return '② Energy Isolation';
      if (t < 12) return '③ Applying Lockout Device';
      if (t < 17) return '④ Attaching Danger Tag';
      if (t < 22) return '⑤ Verifying Zero Energy';
      return '✓ Machine Safely Locked Out';
    }
    if (simId === 'FIRE_EVAC_003') {
      return '📡 Live Incident Sync Active';
    }
    return 'Simulation preview...';
  };

  const [label, setLabel] = useState('');
  const [phaseT, setPhaseT] = useState(0);

  const isUrgent = simId => false;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [0, 1.5, 6.5], fov: 52 }} gl={{ antialias: true }} dpr={[1, 1.5]}>
        <Scene />
        <PhaseTracker cycle={cycle} onPhase={(t) => {
          setPhaseT(t);
          setLabel(getLabel(simulationId, t));
        }} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.5}
          minPolarAngle={Math.PI / 5}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>

      {/* Phase overlay */}
      <div style={{
        position: 'absolute',
        bottom: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        background: isUrgent(simulationId) ? 'rgba(239,68,68,0.75)' : 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)',
        padding: '6px 18px',
        borderRadius: 30,
        color: '#fff',
        fontWeight: 700,
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        whiteSpace: 'nowrap',
        border: `1px solid ${isUrgent(simulationId) ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.2)'}`,
        transition: 'all 0.4s ease',
        letterSpacing: '0.03em',
      }}>
        {label}
      </div>
    </div>
  );
}
