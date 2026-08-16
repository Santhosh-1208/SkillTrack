import React, { createContext, useContext, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Billboard, Box, Sphere, Cylinder, Cone } from "@react-three/drei";

// --- Scene State Context ---
const SceneStateContext = createContext({});
export const SceneStateProvider = ({ simulationId, currentStepId, selectedOptionId, children }) => {
  const sceneState = useMemo(() => ({ simulationId, stepId: currentStepId, optionId: selectedOptionId }),
    [simulationId, currentStepId, selectedOptionId]);
  return <SceneStateContext.Provider value={sceneState}>{children}</SceneStateContext.Provider>;
};
export const useSceneState = () => useContext(SceneStateContext);

// ─── Shared Primitives ────────────────────────────────────────────────────────

const HazardLabel = ({ position, state, label }) => {
  const color = state === "resolved" ? "#22c55e" : state === "warning" ? "#f59e0b" : "#ef4444";
  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      <mesh>
        <planeGeometry args={[2.2, 0.55]} />
        <meshBasicMaterial color={color} opacity={0.88} transparent />
      </mesh>
      <Text position={[0, 0, 0.01]} fontSize={0.2} color="white" anchorX="center" anchorY="middle">{label}</Text>
    </Billboard>
  );
};

const Floor = ({ color = "#e5e7eb" }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
    <planeGeometry args={[24, 24]} />
    <meshStandardMaterial color={color} />
  </mesh>
);

const Wall = ({ position, rotation, w = 12, h = 5, color = "#d1d5db" }) => (
  <mesh position={position} rotation={rotation}>
    <planeGeometry args={[w, h]} />
    <meshStandardMaterial color={color} />
  </mesh>
);

// Stick-figure worker avatar
const Worker = ({ position = [0, -1, 0], color = "#3b82f6", helmet = false, helmetColor = "#fbbf24", goggles = false, gloves = false, boots = false }) => (
  <group position={position}>
    {/* Body */}
    <Cylinder args={[0.45, 0.45, 2, 16]} position={[0, 0, 0]} material-color={color} />
    {/* Head */}
    <Sphere args={[0.38]} position={[0, 1.38, 0]} material-color="#fca5a5" />
    {/* Helmet */}
    {helmet && <Sphere args={[0.44]} position={[0, 1.78, 0]} material-color={helmetColor} />}
    {/* Goggles */}
    {goggles && <Box args={[0.55, 0.18, 0.42]} position={[0, 1.38, 0.28]} material-color="rgba(134,239,172,0.7)" material-transparent />}
    {/* Gloves */}
    {gloves && <>
      <Box args={[0.28, 0.38, 0.28]} position={[-0.7, -0.4, 0]} material-color="#34d399" />
      <Box args={[0.28, 0.38, 0.28]} position={[0.7, -0.4, 0]} material-color="#34d399" />
    </>}
    {/* Boots */}
    {boots && <>
      <Box args={[0.36, 0.28, 0.58]} position={[-0.28, -1.14, 0.1]} material-color="#1e293b" />
      <Box args={[0.36, 0.28, 0.58]} position={[0.28, -1.14, 0.1]} material-color="#1e293b" />
    </>}
  </group>
);

// ─── PPE_COMPLIANCE_001 ───────────────────────────────────────────────────────

const PpeComplianceScene = () => {
  const { stepId, optionId } = useSceneState();
  const step = stepId?.slice(-2); // S1, S2 …
  const n = parseInt(step?.replace("S", "") || "0", 10);

  const helmetOn     = n >= 2;
  const gogglesOn    = n >= 4;
  const glovesOn     = n >= 5;
  const bootsOn      = n >= 6;
  const helmetCrack  = stepId === "PPE_S3" && !optionId;
  const badDecisionA = stepId === "PPE_S3" && optionId === "A";
  const badDecisionC = stepId === "PPE_S3" && optionId === "C";
  const helmetGood   = stepId === "PPE_S3" && optionId === "B";
  const helmetColor  = helmetGood ? "#22c55e" : "#fbbf24";

  return (
    <group>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 10, 5]} intensity={1.1} castShadow />
      <Floor />
      <Wall position={[0, 0.5, -5]} rotation={[0, 0, 0]} />

      {/* PPE Rack */}
      <Box args={[6, 3, 0.4]} position={[0, 0, -4.7]} material-color="#9ca3af" />
      {/* Items on rack */}
      <Box args={[0.5, 0.5, 0.5]} position={[-2, 1, -4.4]} material-color="#fbbf24" />
      <Box args={[0.55, 0.18, 0.4]} position={[0, 1, -4.4]} material-color="#6ee7b7" />
      <Box args={[0.3, 0.4, 0.28]} position={[1.5, 0.8, -4.4]} material-color="#94a3b8" />
      <Box args={[0.36, 0.28, 0.56]} position={[-1.5, 0.6, -4.4]} material-color="#1e293b" />

      {/* Signage board */}
      <Box args={[4, 1, 0.1]} position={[0, 3, -4.8]} material-color={stepId === "PPE_S1" ? "#10b981" : "#4b5563"} />
      <Text position={[0, 3, -4.6]} fontSize={0.28} color="white" anchorX="center">REQUIRED PPE</Text>

      {/* Worker */}
      <Worker helmet={helmetOn} helmetColor={helmetColor} goggles={gogglesOn} gloves={glovesOn} boots={bootsOn} />

      {/* Crack indicator during inspection */}
      {(helmetCrack || badDecisionA) && (
        <mesh position={[0, 1.88, 0.4]}>
          <planeGeometry args={[0.22, 0.06]} />
          <meshBasicMaterial color="black" />
        </mesh>
      )}
      {badDecisionA && <HazardLabel position={[0, 3.5, 0]} state="unresolved" label="⚠ CRACKED HELMET - RISK" />}
      {badDecisionC && <HazardLabel position={[0, 3.5, 0]} state="warning" label="⚠ TAPE FIX - NOT ALLOWED" />}
      {helmetGood   && <HazardLabel position={[0, 3.5, 0]} state="resolved" label="✓ HELMET REPLACED" />}

      {/* S8 Checkpoint Gate */}
      {stepId === "PPE_S8" && (
        <group position={[0, 0, 3.5]}>
          <Box args={[0.4, 4.5, 0.4]} position={[-2, 0.25, 0]} material-color="#22c55e" />
          <Box args={[0.4, 4.5, 0.4]} position={[2, 0.25, 0]} material-color="#22c55e" />
          <Box args={[4.5, 0.4, 0.4]} position={[0, 2.45, 0]} material-color="#22c55e" />
          <HazardLabel position={[0, 3.6, 0]} state="resolved" label="✓ CHECKPOINT - ACCESS GRANTED" />
        </group>
      )}
    </group>
  );
};

// ─── HAZARD_IDENT_002 ─────────────────────────────────────────────────────────

const HazardIdentScene = () => {
  const { stepId, optionId } = useSceneState();

  const isS1 = stepId === "HAZ_S1";
  const isS2 = stepId === "HAZ_S2";
  const isS3 = stepId === "HAZ_S3";
  const isS4 = stepId === "HAZ_S4";
  const isS5 = stepId === "HAZ_S5";
  const isS6 = stepId === "HAZ_S6";
  const isS7 = stepId === "HAZ_S7";
  const isS8 = stepId === "HAZ_S8";

  const exitBlocked = isS3 && !optionId;
  const exitDecidedBad = isS3 && optionId === "A";
  const exitDecidedGood = isS3 && optionId === "B";
  const chemDecidedBad = isS6 && optionId === "A";
  const chemDecidedGood = isS6 && optionId === "B";

  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} />
      <Floor color="#f0f0f0" />
      {/* Walls */}
      <Wall position={[0, 0.5, -6]} rotation={[0, 0, 0]} />
      <Wall position={[-6, 0.5, 0]} rotation={[0, Math.PI / 2, 0]} />
      <Wall position={[6, 0.5, 0]} rotation={[0, -Math.PI / 2, 0]} />

      {/* S1: Clipboard / checklist on table */}
      <Box args={[0.7, 0.05, 0.9]} position={[-3, -1.5, 2]} material-color="#ffffff" />
      <Box args={[0.6, 0.06, 0.8]} position={[-3, -1.44, 2]} material-color={isS1 ? "#3b82f6" : "#d1d5db"} />
      {isS1 && <HazardLabel position={[-3, 0.5, 2]} state="resolved" label="✓ CHECKLIST OBTAINED" />}

      {/* S2: Floor hazards — cable, spill */}
      <Box args={[3, 0.07, 0.12]} position={[0, -1.95, 1]} rotation={[0, 0.3, 0]}
        material-color={isS2 ? "#ef4444" : "#94a3b8"} />
      <Sphere args={[0.5, 12, 12]} position={[2, -1.95, 0]} material-color={isS2 ? "#fbbf24" : "#d1d5db"} />
      {isS2 && <HazardLabel position={[1, 0.5, 0.5]} state="unresolved" label="⚠ TRIP HAZARD & SPILL FOUND" />}

      {/* S3: Fire exit — blocked or clear */}
      <group position={[5.6, 0.5, -2]}>
        {/* Door frame */}
        <Box args={[0.2, 4.5, 2]} position={[0, 0, 0]} material-color={exitDecidedGood ? "#22c55e" : exitDecidedBad ? "#ef4444" : isS3 ? "#f59e0b" : "#6b7280"} />
        <Text position={[0.12, 0.5, 0]} fontSize={0.22} color="white" rotation={[0, -Math.PI / 2, 0]}>EXIT</Text>
        {/* Blocked pallet */}
        {(isS3 || exitDecidedBad) && (
          <Box args={[0.8, 0.7, 1.5]} position={[0.5, -1.5, 0]} material-color={exitDecidedBad ? "#ef4444" : "#f59e0b"} />
        )}
        {exitBlocked && <HazardLabel position={[0.5, 1.5, 0]} state="warning" label="⚠ EXIT BLOCKED — DECIDE" />}
        {exitDecidedBad && <HazardLabel position={[0.5, 1.5, 0]} state="unresolved" label="✗ PALLET LEFT — VIOLATION" />}
        {exitDecidedGood && <HazardLabel position={[0.5, 1.5, 0]} state="resolved" label="✓ EXIT CLEARED" />}
      </group>

      {/* S4: Fire extinguisher */}
      <group position={[-4.5, -0.5, -1]}>
        <Cylinder args={[0.18, 0.22, 1.2, 12]} position={[0, 0, 0]} material-color={isS4 ? "#ef4444" : "#9ca3af"} />
        <Box args={[0.08, 0.3, 0.08]} position={[0, 0.75, 0]} material-color="#4b5563" />
        {isS4 && <HazardLabel position={[0, 2, 0]} state="resolved" label="✓ EXTINGUISHER INSPECTED" />}
      </group>

      {/* S5: Machinery with/without guard */}
      <group position={[3, -0.5, -3]}>
        <Box args={[2, 2, 1.5]} position={[0, 0, 0]} material-color="#64748b" />
        {/* Missing guard indicator */}
        {isS5 && (
          <>
            <Box args={[0.7, 0.7, 0.08]} position={[0, 0.5, 0.8]} material-color="#ef4444" material-transparent material-opacity={0.6} />
            <HazardLabel position={[0, 2.5, 0]} state="unresolved" label="⚠ MISSING GUARD — HAZARD" />
          </>
        )}
      </group>

      {/* S6: Chemical storage */}
      <group position={[-3, -0.5, -4]}>
        <Box args={[0.5, 0.8, 0.5]} position={[-0.6, 0, 0]} material-color={chemDecidedGood ? "#22c55e" : chemDecidedBad ? "#ef4444" : isS6 ? "#f59e0b" : "#94a3b8"} />
        <Box args={[0.5, 0.8, 0.5]} position={[0.6, 0, 0]} material-color={chemDecidedGood ? "#22c55e" : chemDecidedBad ? "#ef4444" : isS6 ? "#f59e0b" : "#94a3b8"} />
        <Box args={[0.5, 0.8, 0.5]} position={[0, 0, 0]} material-color="#94a3b8" />
        {isS6 && !optionId && <HazardLabel position={[0, 2, 0]} state="warning" label="⚠ UNLABELED CHEMICALS" />}
        {chemDecidedBad && <HazardLabel position={[0, 2, 0]} state="unresolved" label="✗ CHEMICALS NOT SEGREGATED" />}
        {chemDecidedGood && <HazardLabel position={[0, 2, 0]} state="resolved" label="✓ SEGREGATED & TAGGED" />}
      </group>

      {/* S7: Light fittings */}
      {isS7 && (
        <group>
          <Box args={[0.6, 0.15, 0.6]} position={[-2, 2.5, 0]} material-color="#fde68a" />
          <Box args={[0.6, 0.15, 0.6]} position={[2, 2.5, 0]} material-color="#fde68a" />
          <Box args={[0.6, 0.15, 0.6]} position={[0, 2.5, -3]} material-color="#9ca3af" />
          <HazardLabel position={[0, 3.5, -3]} state="warning" label="⚠ LIGHTING OUT — NOTE IT" />
          <HazardLabel position={[0, 3, 1]} state="resolved" label="✓ LIGHTING VERIFIED" />
        </group>
      )}

      {/* S8: Laptop / reporting terminal */}
      {isS8 && (
        <group position={[0, -1.2, 2]}>
          <Box args={[1.4, 0.08, 0.9]} position={[0, 0, 0]} material-color="#374151" />
          <Box args={[1.4, 0.9, 0.06]} position={[0, 0.5, -0.42]} rotation={[-0.3, 0, 0]} material-color="#1e293b" />
          <HazardLabel position={[0, 1.5, 0]} state="resolved" label="✓ HAZARDS LOGGED" />
        </group>
      )}

      {/* Worker with clipboard from S1 onwards */}
      <Worker position={[-1, -1, 1]} color="#4b5563" />
    </group>
  );
};

// ─── LOTO_PROC_004 ────────────────────────────────────────────────────────────

const LotoScene = () => {
  const { stepId, optionId } = useSceneState();

  const n = parseInt(stepId?.replace("LOTO_S", "") || "0", 10);

  const isPneumaticDecision = stepId === "LOTO_S4";
  const ignoresPneu = isPneumaticDecision && optionId === "A";
  const fixesPneu   = isPneumaticDecision && optionId === "B";
  const isVoltDecision = stepId === "LOTO_S8";
  const proceedsUnsafe = isVoltDecision && optionId === "A";
  const stopsCorrectly = isVoltDecision && optionId === "B";

  const machinePowered = n <= 2;
  const machineStopped = n >= 3;
  const breakerOff     = n >= 4;
  const lockApplied    = n >= 5;
  const tagApplied     = n >= 6;
  const energyDrained  = n >= 7;
  const verified       = n >= 8;

  return (
    <group>
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 5, 0]} intensity={machinePowered ? 2 : 0.3} color={machinePowered ? "#fbbf24" : "#94a3b8"} />
      <directionalLight position={[8, 10, 4]} intensity={0.9} />
      <Floor color="#e2e8f0" />
      <Wall position={[0, 0.5, -6]} rotation={[0, 0, 0]} />

      {/* Machine body */}
      <group position={[0, -0.2, -2]}>
        <Box args={[3, 3.5, 2]} position={[0, 0, 0]} material-color={machinePowered ? "#1e40af" : energyDrained ? "#374151" : "#334155"} />
        {/* Spinning part indicator */}
        {machinePowered && (
          <>
            <Cylinder args={[0.6, 0.6, 0.3, 16]} position={[0, 0.5, 1.05]} material-color="#ef4444" />
            <HazardLabel position={[0, 3, 0]} state="unresolved" label="⚡ MACHINE ENERGISED" />
          </>
        )}
        {machineStopped && !breakerOff && <HazardLabel position={[0, 3, 0]} state="warning" label="⏹ MACHINE STOPPED" />}
        {breakerOff && <HazardLabel position={[0, 3, 0]} state={energyDrained ? "resolved" : "warning"} label={energyDrained ? "✓ ZERO ENERGY STATE" : "⚠ BREAKER OPEN"} />}
      </group>

      {/* Power breaker panel */}
      <group position={[-4.5, 0.5, -1]}>
        <Box args={[0.2, 2.5, 1.5]} position={[0, 0, 0]} material-color="#374151" />
        {/* Breaker handle */}
        <Box args={[0.08, 0.6, 0.3]} position={[0.15, breakerOff ? -0.3 : 0.3, 0]} material-color={breakerOff ? "#22c55e" : "#ef4444"} />
        {lockApplied && (
          <>
            <Box args={[0.22, 0.5, 0.5]} position={[0.22, -0.3, 0]} material-color="#f97316" material-opacity={0.9} material-transparent />
            <HazardLabel position={[0, 2, 0]} state="resolved" label="🔒 PADLOCK APPLIED" />
          </>
        )}
        {tagApplied && <HazardLabel position={[0, 2.6, 0]} state="resolved" label="🏷 LOTO TAG ATTACHED" />}
        {!breakerOff && <HazardLabel position={[0, 2, 0]} state="unresolved" label="⚡ LIVE — DO NOT TOUCH" />}
      </group>

      {/* Pneumatic line */}
      <group position={[3, -0.5, -1]}>
        <Cylinder args={[0.12, 0.12, 3, 8]} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}
          material-color={ignoresPneu ? "#ef4444" : fixesPneu ? "#22c55e" : isPneumaticDecision ? "#f59e0b" : "#94a3b8"} />
        <Cylinder args={[0.25, 0.25, 0.4, 8]} position={[1.5, 0, 0]}
          material-color={fixesPneu ? "#22c55e" : "#64748b"} />
        {isPneumaticDecision && !optionId && <HazardLabel position={[0, 2, 0]} state="warning" label="⚠ PNEUMATIC LINE ACTIVE" />}
        {ignoresPneu && <HazardLabel position={[0, 2, 0]} state="unresolved" label="✗ AIR LINE IGNORED — HAZARD" />}
        {fixesPneu && <HazardLabel position={[0, 2, 0]} state="resolved" label="✓ PNEUMATIC LOCKED OUT" />}
      </group>

      {/* Voltmeter */}
      {n >= 8 && (
        <group position={[2, -1, 1.5]}>
          <Box args={[0.7, 0.5, 0.2]} position={[0, 0, 0]} material-color="#1e293b" />
          <Box args={[0.5, 0.3, 0.05]} position={[0, 0, 0.12]} material-color={stopsCorrectly ? "#22c55e" : proceedsUnsafe ? "#ef4444" : "#f59e0b"} />
          {isVoltDecision && !optionId && <HazardLabel position={[0, 1.5, 0]} state="warning" label="⚡ 6V RESIDUAL — DECIDE" />}
          {proceedsUnsafe && <HazardLabel position={[0, 1.5, 0]} state="unresolved" label="✗ UNSAFE — RESIDUAL VOLTAGE" />}
          {stopsCorrectly && <HazardLabel position={[0, 1.5, 0]} state="resolved" label="✓ ZERO ENERGY VERIFIED" />}
        </group>
      )}

      {/* Worker */}
      <Worker position={[1.5, -1, 1]} color="#1e3a5f" helmet boots />
    </group>
  );
};

// ─── FIRE_EVAC_003 ────────────────────────────────────────────────────────────

const FireEvacScene = () => {
  const { stepId, optionId } = useSceneState();

  const n = parseInt(stepId?.replace("FIRE_S", "") || "0", 10);

  const fireDetected = n >= 1;
  const alarmPulled  = n >= 2;
  const calledEmerg  = n >= 3;
  const assessedFire = n >= 4;
  const alertColl    = n >= 5;
  const atExit       = n >= 6;
  const closedDoors  = n >= 7;
  const atAssembly   = n >= 8;

  const fightFire   = stepId === "FIRE_S4" && optionId === "A";
  const evacuateOk  = stepId === "FIRE_S4" && optionId === "B";
  const runSmoke    = stepId === "FIRE_S6" && optionId === "A";
  const crawlSafe   = stepId === "FIRE_S6" && optionId === "B";

  return (
    <group>
      {/* Lighting — red tint when fire is active */}
      <ambientLight intensity={0.4} color={fireDetected && !atAssembly ? "#ff6b35" : "#fff"} />
      <pointLight position={[-3, 1, 2]} intensity={fireDetected ? 3 : 0} color="#ff4500" />
      <directionalLight position={[6, 10, 4]} intensity={0.8} />
      <Floor color={atAssembly ? "#d1fae5" : "#f3f4f6"} />

      {/* Walls */}
      <Wall position={[0, 0.5, -6]} rotation={[0, 0, 0]} />
      <Wall position={[-7, 0.5, 0]} rotation={[0, Math.PI / 2, 0]} w={14} />
      <Wall position={[7, 0.5, 0]} rotation={[0, -Math.PI / 2, 0]} w={14} />

      {/* Fire source — top-left corner */}
      <group position={[-4, -1, -4]}>
        {/* Bin / waste basket */}
        <Cylinder args={[0.4, 0.3, 0.8, 10]} position={[0, 0, 0]} material-color="#374151" />
        {fireDetected && <>
          {/* Flame cone */}
          <Cone args={[0.5, 1.4, 8]} position={[0, 1, 0]} material-color="#f97316" material-transparent material-opacity={0.85} />
          <Cone args={[0.3, 1.0, 8]} position={[0.1, 1.2, 0.1]} material-color="#fbbf24" material-transparent material-opacity={0.75} />
          <pointLight position={[0, 1, 0]} intensity={fightFire ? 0.5 : 4} color="#ff4500" distance={6} />
        </>}
        {n === 1 && <HazardLabel position={[0, 2.5, 0]} state="unresolved" label="🔥 FIRE IDENTIFIED" />}
        {fightFire && <HazardLabel position={[0, 3, 0]} state="unresolved" label="✗ FIRE TOO LARGE — EVACUATE" />}
        {evacuateOk && <HazardLabel position={[0, 2.5, 0]} state="resolved" label="✓ CORRECT — EVACUATE NOW" />}
      </group>

      {/* Fire alarm pull station */}
      <group position={[5, 0.5, -5.7]}>
        <Box args={[0.4, 0.6, 0.1]} position={[0, 0, 0]} material-color={alarmPulled ? "#22c55e" : "#ef4444"} />
        <Box args={[0.3, 0.1, 0.12]} position={[0, -0.15, 0.05]} material-color={alarmPulled ? "#d1fae5" : "#fca5a5"} />
        {n === 2 && <HazardLabel position={[0, 2, 0]} state="resolved" label="🔔 ALARM ACTIVATED" />}
      </group>

      {/* Fire exit door */}
      <group position={[6.8, 0.5, 0]}>
        <Box args={[0.2, 4.5, 2.2]} position={[0, 0, 0]} material-color={crawlSafe ? "#22c55e" : runSmoke ? "#ef4444" : atExit ? "#f59e0b" : "#6b7280"} />
        <Text position={[-0.12, 0.5, 0]} fontSize={0.28} color="white" rotation={[0, Math.PI / 2, 0]}>EXIT</Text>
        {atExit && !optionId && <HazardLabel position={[-1, 3, 0]} state="warning" label="⚠ SMOKE BLOCKING PRIMARY EXIT" />}
        {runSmoke && <HazardLabel position={[-1, 3, 0]} state="unresolved" label="✗ DANGEROUS — SMOKE INHALE RISK" />}
        {crawlSafe && <HazardLabel position={[-1, 3, 0]} state="resolved" label="✓ CRAWLED LOW — SAFE" />}
      </group>

      {/* Secondary exit */}
      <group position={[-6.8, 0.5, 2]}>
        <Box args={[0.2, 4.5, 2]} position={[0, 0, 0]} material-color={crawlSafe ? "#22c55e" : "#4b5563"} />
        <Text position={[0.12, 0.5, 0]} fontSize={0.28} color="white" rotation={[0, -Math.PI / 2, 0]}>SECONDARY EXIT</Text>
      </group>

      {/* Smoke cloud near primary exit */}
      {atExit && (
        <group position={[4, 1, -1]}>
          <Sphere args={[1.2, 8, 8]} position={[0, 0, 0]} material-color="#9ca3af" material-transparent material-opacity={0.6} />
          <Sphere args={[0.9, 8, 8]} position={[1, 0.3, 0.5]} material-color="#6b7280" material-transparent material-opacity={0.5} />
          <Sphere args={[0.7, 8, 8]} position={[-0.5, 0.5, -0.5]} material-color="#9ca3af" material-transparent material-opacity={0.45} />
        </group>
      )}

      {/* Fire doors */}
      <group position={[0, 0.5, -1]}>
        <Box args={[1.8, 4.5, 0.12]} position={[-1, 0, 0]} material-color={closedDoors ? "#374151" : "#6b7280"} />
        <Box args={[1.8, 4.5, 0.12]} position={[1, 0, 0]} material-color={closedDoors ? "#374151" : "#6b7280"} />
        {n === 7 && <HazardLabel position={[0, 3.5, 0]} state="resolved" label="✓ FIRE DOORS CLOSED" />}
      </group>

      {/* Assembly point */}
      {atAssembly && (
        <group position={[0, -1.95, 5]}>
          <Box args={[4, 0.04, 4]} position={[0, 0, 0]} material-color="#22c55e" material-transparent material-opacity={0.5} />
          <Text position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.35} color="#166534">ASSEMBLY POINT</Text>
          <HazardLabel position={[0, 2, 0]} state="resolved" label="✓ ASSEMBLY COMPLETE — HEADCOUNT" />
        </group>
      )}

      {/* Worker */}
      <Worker
        position={crawlSafe ? [3, -1.7, 1] : [1, -1, 0]}
        color={alarmPulled ? "#dc2626" : "#374151"}
        helmet
        boots
      />

      {/* Colleagues evacuating from S5 */}
      {alertColl && <>
        <Worker position={[2, -1, 3]} color="#6b7280" />
        <Worker position={[3, -1, 2]} color="#9ca3af" />
      </>}
    </group>
  );
};

// ─── Main Viewer ─────────────────────────────────────────────────────────────

const SCENE_MAP = {
  PPE_COMPLIANCE_001: PpeComplianceScene,
  HAZARD_IDENT_002: HazardIdentScene,
  LOTO_PROC_004: LotoScene,
  FIRE_EVAC_003: FireEvacScene,
};

export const SafetySimulationViewer = ({ simulationId, currentStepId, selectedOptionId }) => {
  const SceneComponent = SCENE_MAP[simulationId];

  return (
    <div className="w-full h-full bg-slate-900 rounded-2xl overflow-hidden relative">
      <SceneStateProvider simulationId={simulationId} currentStepId={currentStepId} selectedOptionId={selectedOptionId}>
        <Canvas camera={{ position: [0, 3, 9], fov: 48 }} shadows>
          {SceneComponent
            ? <SceneComponent />
            : (
              <group>
                <ambientLight intensity={0.5} />
                <Text position={[0, 0, 0]} fontSize={0.5} color="white">
                  Viewer not available for{"\n"}{simulationId}
                </Text>
              </group>
            )}
          <OrbitControls enablePan enableZoom enableRotate />
        </Canvas>
      </SceneStateProvider>
    </div>
  );
};
