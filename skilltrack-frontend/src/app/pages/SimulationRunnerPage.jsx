import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Check, Shield, RefreshCw, MessageCircle, X, Send, Brain } from "lucide-react";
import { attemptsApi } from "../../api/attemptsApi";
import { simulationsApi } from "../../api/simulationsApi";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { useToast } from "../../platform/engine/context/ToastContext";
import { Badge, BackendErrorNotice } from "../components/shared/atoms";
import { apiClient } from "../../lib/apiClient";

// --- View Components (factory pattern) ---
import { ProceduralView } from "./components/ProceduralView";
import { VisualInspectionView } from "./components/VisualInspectionView";
import { TerminalSandboxView } from "./components/TerminalSandboxView";
import { SafetySimulationViewer } from "./components/SafetySimulationViewer";
import { EngineTerminalWidget } from "../../platform/widgets/EngineTerminalWidget";
import { SCENARIO_REGISTRY } from "../../scenarios";

function levelBadge(level) {
  if (level <= 1) return { label: "Easy", color: "green" };
  if (level === 2) return { label: "Medium", color: "orange" };
  return { label: "Hard", color: "red" };
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SimulationRunnerPage({ simulationId, onNavigate, onComplete }) {
  const { user } = useAuth();
  const toast = useToast();
  const [simulation, setSimulation] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [pendingDecision, setPendingDecision] = useState(null);
  const [decisionStartedAt, setDecisionStartedAt] = useState(null);
  const [lastDecision, setLastDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(false);

  // --- SOP Validation & Hint State ---
  const [currentStepAcknowledged, setCurrentStepAcknowledged] = useState(false);
  const [hintsUsed, setHintsUsed] = useState([]);
  const [revealedHintStepId, setRevealedHintStepId] = useState(null);

  // --- Chatbot State ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // --- PPE Simulation State & CV detections ---
  const [ppeState, setPpeState] = useState({
    helmet: null,
    goggles: false,
    gloves: false,
    boots: false,
  });
  const [visionLoading, setVisionLoading] = useState(false);
  const [yoloDetections, setYoloDetections] = useState([]);

  // --- Electrical Panel State (Wired to Nodal Solver & LOTO Graph Validator) ---
  const [elecState, setElecState] = useState({
    mainBreaker: "ON",
    lockApplied: false,
    tagApplied: false,
    groundConnected: false,
    measuredVoltage: 230,
  });
  const [lotoWarnings, setLotoWarnings] = useState([]);
  const [lotoRiskScore, setLotoRiskScore] = useState(0);

  // --- CNC Machine State (Wired to real-time G-Code toolpath parser) ---
  const [cncState, setCncState] = useState({
    gcodeText: `G28 X0 Y0\nG01 X30 Y20\nG01 X70 Y20\nG01 X70 Y80\nG01 X30 Y80\nG01 X30 Y20\nG28 X0 Y0`,
    isHomed: false,
    deviation: 0.25,
    crashWarning: false,
  });

  // --- Terminal Sandbox State (for all IT/DevOps simulations) ---
  const [cyberState, setCyberState] = useState({
    terminalLogs: [
      "Connecting to Sandbox Orchestrator on Port 8086...",
      "Alpine container instance spawned safely inside gVisor sandbox.",
      "Type 'help' to see container commands.",
    ],
    terminalCommand: "",
    sandboxId: null,
  });

  const steps = useMemo(() => {
    if (!simulation?.sop_steps) return [];
    return [...simulation.sop_steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [simulation]);

  const currentStep = steps[stepIndex];
  const diff = levelBadge(simulation?.level ?? 2);
  
  // Calculate true completed size (filtering out accidental undefined)
  const trueCompletedCount = Array.from(completedSteps).filter(Boolean).length;
  const progressPct = steps.length ? Math.min(100, Math.round((trueCompletedCount / steps.length) * 100)) : 0;

  // Determine simulation type from the config (fallback to PROCEDURAL)
  const pattern = simulation?.interaction_pattern || simulation?.simulation_type || "PROCEDURAL";
  // The interaction_pattern can be "VISUAL", "TERMINAL", "sandbox" etc.
  const simulationType = pattern.toUpperCase() === "SANDBOX" ? "TERMINAL" : pattern.toUpperCase();

  // Terminal-type simulation IDs
  const TERMINAL_SIMS = ["CYBER_INCIDENT_004", "UBUNTU_MGMT_011", "GIT_COLLAB_012", "APP_DEPLOY_013", "EOD_SHUTDOWN_014"];
  const SAFETY_SIMS = ["PPE_COMPLIANCE_001", "HAZARD_IDENT_002", "LOTO_PROC_004", "FIRE_EVAC_003"];
  const isTerminalSim = simulationType === "TERMINAL" || TERMINAL_SIMS.includes(simulationId);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user?.id || !simulationId || startedRef.current) return;
    startedRef.current = true;
    setLoading(true);
    setError(null);

    // Initialize sandbox container if Terminal simulation
    let initPromise = Promise.resolve(null);
    if (TERMINAL_SIMS.includes(simulationId)) {
      initPromise = fetch(`http://localhost:8086/sandbox/start?simulation_id=${simulationId}`, { method: "POST" })
        .then((res) => res.json())
        .catch(() => null);
    }

    Promise.all([
      simulationsApi.getOne(simulationId),
      attemptsApi.start({ simulationId, learnerId: user.id }).catch(err => {
        console.warn("Attempt service unavailable, using mock attempt ID", err);
        return { attempt_id: `mock_attempt_${Date.now()}` };
      }),
      initPromise
    ])
      .then(([sim, attempt, sandbox]) => {
        setSimulation(sim);
        setAttemptId(attempt.attempt_id);
        if (sandbox) {
          setCyberState((prev) => ({
            ...prev,
            sandboxId: sandbox.sandbox_id,
            terminalLogs: [...prev.terminalLogs, `Sandbox successfully initialized. ID: ${sandbox.sandbox_id}`]
          }));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.id, simulationId]);

  // Clean up sandbox containers on unmount
  useEffect(() => {
    return () => {
      if (cyberState.sandboxId) {
        fetch(`http://localhost:8086/sandbox/stop?sandbox_id=${cyberState.sandboxId}`, { method: "POST" }).catch(() => null);
      }
    };
  }, [cyberState.sandboxId]);

  function decisionForStep(stepId) {
    return (simulation?.decision_points || []).find((dp) => dp.after_step === stepId) || null;
  }

  async function handleNext() {
    if (!attemptId || !currentStep || submitting) return;
    if (!currentStepAcknowledged && !completedSteps.has(currentStep.step_id)) {
      toast.error("Please complete and acknowledge the active step before continuing.");
      return;
    }
    setSubmitting(true);
    try {
      if (!completedSteps.has(currentStep.step_id)) {
        await attemptsApi.logAction(attemptId, {
          stepId: currentStep.step_id,
          actionType: "step_completed",
        });
        setCompletedSteps((prev) => new Set([...prev, currentStep.step_id]));
      }
      setCurrentStepAcknowledged(false);

      const decision = decisionForStep(currentStep.step_id);
      if (decision) {
        setPendingDecision(decision);
        setDecisionStartedAt(Date.now());
        setSubmitting(false);
        return;
      }

      await advanceOrFinish();
    } catch (e) {
      toast.error(e.message || "Could not log step.");
    } finally {
      setSubmitting(false);
    }
  }

  async function advanceOrFinish() {
    if (stepIndex >= steps.length - 1) {
      setSubmitting(true);
      try {
        const result = await attemptsApi.complete(attemptId, null, hintsUsed, elapsed);
        onComplete?.(result);
        toast.success("Simulation complete! View your AI feedback.");
        onNavigate("ai-feedback", { attempt: result });
      } catch (e) {
        toast.error(e.message || "Could not complete simulation.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setStepIndex((i) => i + 1);
  }

  async function handleDecision(option) {
    if (!attemptId || !pendingDecision || submitting) return;
    setSubmitting(true);
    const timeTakenSeconds = decisionStartedAt ? Math.round((Date.now() - decisionStartedAt) / 1000) : 0;
    try {
      await attemptsApi.logDecision(attemptId, {
        decisionId: pendingDecision.decision_id,
        optionIdChosen: option.option_id,
        timeTakenSeconds,
      });
      setLastDecision(option);
      setPendingDecision(null);
      setDecisionStartedAt(null);
      await advanceOrFinish();
    } catch (e) {
      toast.error(e.message || "Could not log decision.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrevious() {
    if (pendingDecision || stepIndex <= 0) return;
    setStepIndex((i) => Math.max(0, i - 1));
    setCurrentStepAcknowledged(completedSteps.has(steps[stepIndex - 1]?.step_id));
  }

  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const userMsg = { role: "user", text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    
    try {
      const res = await fetch("http://localhost:8001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulation: simulation || {},
          attempt: {
            attempt_id: attemptId,
            step_index: stepIndex,
            completed_steps: Array.from(completedSteps)
          },
          question: userMsg.text
        })
      }).then(r => r.json());
      
      setChatMessages(prev => [...prev, { role: "ai", text: res.reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "ai", text: "Sorry, I couldn't connect to the AI service." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- FACTORY: Render the correct view based on simulation_type ---
  function renderSimulationView() {
    // If it's a known terminal sim by ID, always show terminal view
    if (isTerminalSim) {
      return (
        <TerminalSandboxView
          simulationId={simulationId}
          simulation={simulation}
          stepIndex={stepIndex}
          handleNext={handleNext}
          toast={toast}
          cyberState={cyberState}
          setCyberState={setCyberState}
        />
      );
    }

    // Legacy path for simulations not yet migrated to DSL
    switch (simulationType) {
      case "TERMINAL":
        return (
          <TerminalSandboxView
            simulationId={simulationId}
            simulation={simulation}
            stepIndex={stepIndex}
            handleNext={handleNext}
            toast={toast}
            cyberState={cyberState}
            setCyberState={setCyberState}
          />
        );

      case "VISUAL":
        return (
          <VisualInspectionView
            simulationId={simulationId}
            simulation={simulation}
            stepIndex={stepIndex}
            handleNext={handleNext}
            toast={toast}
            ppeState={ppeState}
            setPpeState={setPpeState}
            visionLoading={visionLoading}
            setVisionLoading={setVisionLoading}
            yoloDetections={yoloDetections}
            setYoloDetections={setYoloDetections}
            elecState={elecState}
            setElecState={setElecState}
            lotoWarnings={lotoWarnings}
            setLotoWarnings={setLotoWarnings}
            lotoRiskScore={lotoRiskScore}
            setLotoRiskScore={setLotoRiskScore}
            cncState={cncState}
            setCncState={setCncState}
          />
        );

      case "PROCEDURAL":
      default:
        return <ProceduralView simulation={simulation} />;
    }
  }

  if (SCENARIO_REGISTRY[simulationId]) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#050a14' }}>
        <EngineTerminalWidget
          missionId={simulationId}
          onObjectiveCompleted={(objectiveId) => {
            if (attemptId) {
              attemptsApi.logAction(attemptId, {
                stepId: objectiveId,
                actionType: "step_completed"
              }).catch(e => console.error("Failed to log step:", e));
            }
          }}
          onMissionComplete={async (result) => {
            const finalScore = result?.score ?? 100;
            toast.success(`Mission complete! Score: ${finalScore} pts`);
            const targetId = attemptId || `att_${Date.now()}`;
            // attemptApi.complete takes (attemptId, scoreOverride) but backend expects hints_used if available
            // Let's assume attemptsApi.complete sends hints_used if we pass it as a third arg or an object
            const completedAttempt = await attemptsApi.complete(targetId, finalScore, result?.hints_used, elapsed);
            onComplete?.(completedAttempt);
            onNavigate("ai-feedback", { attempt: completedAttempt });
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-5 max-w-[1400px] mx-auto" style={{ background: '#f5f7f8', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center gap-1.5 text-xs mb-4" style={{ color: '#4b5563' }}>
        <button onClick={() => onNavigate("simulation")} className="hover:text-blue-500 transition-colors">
          Simulations
        </button>
        <ChevronRight size={13} />
        <span className="font-semibold" style={{ color: '#111827' }}>{simulation?.title}</span>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column: Interactive operational lab workspace */}
        <div className="lg:col-span-3 space-y-4">
          
          {SAFETY_SIMS.includes(simulationId) && (
            <div className="rounded-3xl p-6 shadow-sm flex flex-col h-[400px]" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-md font-bold" style={{ color: '#111827' }}>3D Visualization Viewer</h2>
                  <p className="text-xs" style={{ color: '#4b5563' }}>Real-time spatial context</p>
                </div>
                <div className="rounded-2xl px-4 py-2" style={{ background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'right' }}>
                  <div className="text-lg font-mono font-bold" style={{ color: '#111827' }}>{formatElapsed(elapsed)}</div>
                  <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: '#6b7280' }}>Timer</p>
                </div>
              </div>
              <SafetySimulationViewer 
                simulationId={simulationId} 
                currentStepId={currentStep?.step_id} 
                selectedOptionId={lastDecision?.option_id} 
              />
            </div>
          )}

          {!SAFETY_SIMS.includes(simulationId) && (
            <div className="rounded-3xl p-6 shadow-sm flex flex-col h-[560px]" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-md font-bold" style={{ color: '#111827' }}>Solved Operational Canvas</h2>
                  <p className="text-xs" style={{ color: '#4b5563' }}>Perform manual tasks or runs here</p>
                </div>
                <div className="rounded-2xl px-4 py-2" style={{ background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'right' }}>
                  <div className="text-lg font-mono font-bold" style={{ color: '#111827' }}>{formatElapsed(elapsed)}</div>
                  <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: '#6b7280' }}>Timer</p>
                </div>
              </div>
              {renderSimulationView()}
            </div>
          )}

          {!pendingDecision && (
            <div className="rounded-3xl p-6 shadow-sm flex flex-col gap-4" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
              <h3 className="text-sm font-bold text-gray-900">Active SOP Step</h3>
              <p className="text-sm text-gray-700">{currentStep?.instruction}</p>

              {/* Inline hint reveal */}
              {revealedHintStepId === currentStep?.step_id && currentStep?.hint && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#d97706' }}>💡 Hint (-5 pts deducted)</p>
                  <p className="text-sm" style={{ color: '#92400e' }}>{currentStep.hint}</p>
                </div>
              )}
              
              {!isTerminalSim && (
                <div className="flex items-center gap-3 mt-1">
                   <input 
                     type="checkbox" 
                     id="ackCheckbox"
                     className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                     checked={currentStepAcknowledged || completedSteps.has(currentStep?.step_id)}
                     onChange={(e) => setCurrentStepAcknowledged(e.target.checked)}
                     disabled={completedSteps.has(currentStep?.step_id)}
                   />
                   <label htmlFor="ackCheckbox" className="text-sm font-semibold text-gray-800 cursor-pointer select-none">
                     I acknowledge I have completed this step
                   </label>
                </div>
              )}

              <div className="flex items-center gap-4">
                 {/* Get Hint — reveal inline, only charge once per step */}
                 <button
                   onClick={() => {
                     if (revealedHintStepId !== currentStep?.step_id) {
                       setHintsUsed(prev => [...prev, 'hint']);
                       setRevealedHintStepId(currentStep?.step_id);
                     }
                   }}
                   disabled={revealedHintStepId === currentStep?.step_id}
                   className="text-xs font-semibold px-4 py-2 rounded-lg shadow-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', borderColor: 'rgba(245,158,11,0.35)' }}
                 >
                   {revealedHintStepId === currentStep?.step_id ? '💡 Hint Shown' : 'Get Hint (-5)'}
                 </button>

                 {/* Get Solution/Help — open AI chat panel */}
                 <button
                   onClick={() => {
                     setHintsUsed(prev => [...prev, 'ai_help']);
                     const seedMsg = `I need help with step ${stepIndex + 1}: "${currentStep?.instruction}". What should I do?`;
                     setChatMessages(prev => [
                       ...prev,
                       { role: 'ai', text: `I'm here to help with step ${stepIndex + 1}: "${currentStep?.instruction}". What would you like to know?` }
                     ]);
                     setIsChatOpen(true);
                   }}
                   className="text-xs font-semibold px-4 py-2 rounded-lg shadow-sm border transition-colors"
                   style={{ background: 'rgba(0,86,210,0.08)', color: '#0056D2', borderColor: 'rgba(0,86,210,0.25)' }}
                 >
                   Get Help (-10)
                 </button>
              </div>
            </div>
          )}

          {!pendingDecision && (
            <>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={handlePrevious}
                  disabled={stepIndex === 0 || submitting}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                  style={{ background: '#f3f4f6', color: '#111827', border: '1px solid rgba(0,0,0,0.06)' }}
                >
                  Previous Step
                </button>
                <button
                  onClick={async () => {
                    if (submitting) return;
                    // Log the skip as an action so scoring knows this step was skipped
                    if (attemptId && currentStep) {
                      try {
                        await attemptsApi.logAction(attemptId, {
                          stepId: currentStep.step_id,
                          actionType: "step_skipped",
                        });
                      } catch (_) {}
                    }
                    // Mark step completed so the checklist shows it done, then advance
                    setCompletedSteps(prev => {
                      const next = new Set(prev);
                      if (currentStep?.step_id) next.add(currentStep.step_id);
                      return next;
                    });
                    setCurrentStepAcknowledged(false);
                    setRevealedHintStepId(null);
                    setStepIndex(i => i + 1);
                  }}
                  disabled={submitting}
                  className="flex-1 py-3 text-white rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 shadow-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  Skip SOP
                </button>
                <button
                  onClick={handleNext}
                  disabled={submitting || (!isTerminalSim && !currentStepAcknowledged && !completedSteps.has(currentStep?.step_id))}
                  className="flex-1 py-3 text-white rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 shadow-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" /> Logged...
                    </>
                  ) : (
                    "Next Step"
                  )}
                </button>
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={async () => {
                    if (submitting) return;
                    setSubmitting(true);
                    try {
                      const result = await attemptsApi.complete(attemptId, null, hintsUsed, elapsed);
                      onComplete?.(result);
                      toast.success("Simulation submitted! View your AI feedback.");
                      onNavigate("ai-feedback", { attempt: result });
                    } catch (e) {
                      toast.error(e.message || "Could not submit simulation.");
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                  className="w-full py-3 text-white rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 shadow-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Submit Attempt"
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Column: active SOP checklist & decisions */}
        <div className="lg:col-span-2 space-y-4">
          {pendingDecision && (
            <div className="rounded-3xl p-5 space-y-4 shadow-sm backdrop-blur-md" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider" style={{ color: '#fcd34d' }}>
                <Shield size={16} /> Decision Room Required
              </div>
              <p className="text-sm font-bold" style={{ color: '#111827' }}>{pendingDecision.prompt}</p>
              <div className="space-y-2">
                {(pendingDecision.options || []).map((opt) => (
                  <button
                    key={opt.option_id}
                    disabled={submitting}
                    onClick={() => handleDecision(opt)}
                    className="w-full text-left px-4 py-3.5 rounded-2xl transition-all text-xs font-semibold shadow-sm hover:translate-x-1"
                    style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', color: '#111827' }}
                  >
                    <span className="font-extrabold mr-2" style={{ color: '#fbbf24' }}>{opt.option_id}.</span>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl p-5 shadow-sm" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: '#111827' }}>SOP Steps Checklist</h3>
              <Badge color={diff.color}>{diff.label}</Badge>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {steps.map((s, i) => {
                const done = completedSteps.has(s.step_id);
                const active = i === stepIndex && !pendingDecision;
                return (
                  <button
                    key={s.step_id}
                    onClick={() => {
                      if (!pendingDecision && (completedSteps.has(s.step_id) || i === stepIndex)) {
                        setStepIndex(i);
                        setCurrentStepAcknowledged(completedSteps.has(s.step_id));
                      } else if (!completedSteps.has(s.step_id)) {
                        toast.info("You must complete the previous steps first.");
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${
                      active
                        ? "shadow-sm font-semibold"
                        : (!completedSteps.has(s.step_id) && i !== stepIndex) 
                        ? "opacity-50 cursor-not-allowed" 
                        : ""
                    }`}
                    style={
                      active
                        ? { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }
                        : done
                        ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }
                        : { background: 'transparent', border: '1px solid rgba(255,255,255,0.04)' }
                    }
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                          ? "bg-blue-500 text-white"
                          : "text-slate-400"
                      }`}
                      style={!done && !active ? { border: '2px solid rgba(0,0,0,0.1)' } : {}}
                    >
                      {done ? <Check size={11} /> : i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${active ? "text-blue-400" : done ? "text-emerald-400" : "text-gray-300"}`}>
                        {s.instruction?.split(".")[0] || `Step ${i + 1}`}
                      </p>
                      <p className="text-[10px] truncate mt-0.5" style={{ color: '#6b7280' }}>{s.instruction}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex justify-between mb-1.5">
                <span className="text-[11px] font-semibold" style={{ color: '#4b5563' }}>SOP Completion Progress</span>
                <span className="text-[11px] font-bold" style={{ color: '#111827' }}>{progressPct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f3f4f6' }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%`, background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Floating AI Chatbot */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <div className="mb-4 w-80 rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', height: '400px' }}>
            <div className="p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #E50914 0%, #b20710 100%)' }}>
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Brain size={16} /> AI Assistant
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-white hover:opacity-75">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: '#f5f7f8' }}>
              {chatMessages.length === 0 && (
                <div className="text-xs text-center" style={{ color: '#4b5563' }}>
                  Ask me anything about this simulation! I'm here to help.
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="p-3 rounded-2xl max-w-[85%] text-xs"
                    style={msg.role === 'user'
                      ? { background: '#3b82f6', color: '#fff', borderRadius: '16px 16px 4px 16px' }
                      : { background: '#f3f4f6', color: '#111827', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px 16px 16px 4px' }
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl rounded-bl-sm text-xs flex items-center gap-2 text-white" style={{ background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <RefreshCw size={12} className="animate-spin" /> Thinking...
                  </div>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSendChat} className="p-3 flex gap-2" style={{ background: '#ffffff', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask for a hint..."
                className="flex-1 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                style={{ background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}
              />
              <button type="submit" disabled={chatLoading || !chatInput.trim()} className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-50" style={{ background: '#0056D2' }}>
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
        
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform"
          style={{ background: '#0056D2', boxShadow: '0 4px 20px rgba(0,86,210,0.4)' }}
        >
          {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>
    </div>
  );
}
