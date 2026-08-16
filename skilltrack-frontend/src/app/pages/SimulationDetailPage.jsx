import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Clock, Target, ChevronRight, Lightbulb, BookOpen, CheckCircle, AlertCircle, Zap, RefreshCw, MessageCircle, X, Send, Brain } from 'lucide-react';
import { simulationsApi } from '../../api/simulationsApi';
import { attemptsApi } from '../../api/attemptsApi';
import { useAuth } from '../../platform/engine/context/AuthContext';
import { useToast } from '../../platform/engine/context/ToastContext';
import { SCENARIO_REGISTRY } from '../../scenarios/index.js';
import { SimulationPreview3D } from './components/SimulationPreview3D';

const SAFETY_SIMS = ["PPE_COMPLIANCE_001", "HAZARD_IDENT_002", "LOTO_PROC_004", "FIRE_EVAC_003"];
const TERMINAL_SIMS = ["CYBER_INCIDENT_004", "UBUNTU_MGMT_011", "GIT_COLLAB_012", "APP_DEPLOY_013", "EOD_SHUTDOWN_014"];

const LEVEL_CONFIG = {
  1: { label: 'Beginner', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  2: { label: 'Intermediate', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  3: { label: 'Advanced', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const PROVIDER_ICONS = { git: '🔀', linux: '🐧', sql: '🗄️', cyber: '🛡️' };

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SimulationDetailPage({ onNavigate }) {
  const { id } = useParams();
  const simulationId = id;
  const { user } = useAuth();
  const toast = useToast();

  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('learn');
  const [isStarted, setIsStarted] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [attemptId, setAttemptId] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Per-step interaction state
  const [acknowledged, setAcknowledged] = useState(false);
  const [hintsUsed, setHintsUsed] = useState([]);
  const [revealedHint, setRevealedHint] = useState(false);

  // AI Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isStarted) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isStarted]);

  useEffect(() => {
    if (!simulationId) return;
    setConfig(null); setError(null); setActiveStepIndex(0);
    setIsStarted(false); setAttemptId(null);
    setCompletedSteps(new Set()); setHintsUsed([]);
    simulationsApi.getOne(simulationId)
      .then(data => setConfig(data))
      .catch(err => setError(err.message || 'Failed to load simulation.'));
  }, [simulationId]);

  // Auto-scroll chat
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Reset per-step state when step changes
  useEffect(() => {
    setAcknowledged(false);
    setRevealedHint(false);
  }, [activeStepIndex]);

  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('http://localhost:8001/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation: config || {},
          attempt: { attempt_id: attemptId, step_index: activeStepIndex, completed_steps: Array.from(completedSteps) },
          question: userMsg.text
        })
      }).then(r => r.json());
      setChatMessages(prev => [...prev, { role: 'ai', text: res.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't connect to the AI service." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleStart = async () => {
    const isEngine = !!SCENARIO_REGISTRY[simulationId];
    if (isEngine || SAFETY_SIMS.includes(simulationId) || TERMINAL_SIMS.includes(simulationId)) {
      onNavigate('simulation-runner', { id: simulationId });
      return;
    }
    try {
      const attempt = await attemptsApi.start({ simulationId, learnerId: user.id });
      setAttemptId(attempt.attempt_id || attempt.id);
      setIsStarted(true);
    } catch (err) {
      setError('Failed to start: ' + (err.message || 'Unknown error'));
    }
  };

  const steps = config?.sop_steps || [];
  const currentStep = steps[activeStepIndex];
  const isLastStep = activeStepIndex >= steps.length - 1;
  const progressPct = steps.length ? Math.round((completedSteps.size / steps.length) * 100) : 0;

  const handleNext = async () => {
    if (!acknowledged && !completedSteps.has(currentStep?.step_id)) {
      toast.error('Please acknowledge you have completed this step before continuing.');
      return;
    }
    if (isCompleting) return;
    if (attemptId && currentStep && !completedSteps.has(currentStep.step_id)) {
      try { await attemptsApi.logAction(attemptId, { stepId: currentStep.step_id, actionType: 'step_completed' }); } catch {}
    }
    setCompletedSteps(prev => new Set([...prev, currentStep?.step_id]));
    setActiveStepIndex(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!acknowledged && !completedSteps.has(currentStep?.step_id)) {
      toast.error('Please acknowledge the final step before submitting.');
      return;
    }
    if (isCompleting) return;
    setIsCompleting(true);
    if (attemptId && currentStep && !completedSteps.has(currentStep.step_id)) {
      try { await attemptsApi.logAction(attemptId, { stepId: currentStep.step_id, actionType: 'step_completed' }); } catch {}
    }
    try {
      const result = await attemptsApi.complete(attemptId, 100, hintsUsed);
      toast.success('Simulation complete! View your AI feedback.');
      onNavigate('ai-feedback', { attempt: result });
    } catch (err) {
      toast.error('Failed to complete: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCompleting(false);
    }
  };

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7f8' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 480, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
          <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#111827' }}>Simulation Unavailable</h2>
          <p style={{ color: '#4b5563', fontSize: 14 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7f8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#4b5563', fontSize: 14 }}>Loading mission briefing…</p>
        </div>
      </div>
    );
  }

  const level = LEVEL_CONFIG[config.level ?? 1] || LEVEL_CONFIG[1];
  const isDSL = !!SCENARIO_REGISTRY[simulationId];
  const providerKey = config.environment?.provider || '';
  const providerIcon = PROVIDER_ICONS[providerKey] || '🛡️';
  const hintCount = hintsUsed.filter(h => h === 'hint').length;
  const helpCount = hintsUsed.filter(h => h === 'ai_help').length;
  const totalPenalty = hintCount * 5 + helpCount * 10;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7f8', fontFamily: 'Inter, sans-serif' }}>

      {/* Hero Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)', padding: '40px 48px 36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          <button onClick={() => onNavigate('simulation')} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Simulations</button>
          <ChevronRight size={12} color="rgba(255,255,255,0.3)" />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{config.title}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#ffffff', fontSize: 32, fontWeight: 800, marginBottom: 10, lineHeight: 1.2 }}>{providerIcon} {config.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, maxWidth: 560, lineHeight: 1.6 }}>{config.goal || config.learning_content?.what || 'Complete this simulation to demonstrate your competency.'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: level.bg, border: `1px solid ${level.color}44`, color: level.color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}><Target size={11} /> {level.label}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 12 }}><BookOpen size={11} /> {steps.length} Steps</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 12 }}><Clock size={11} /> ~15 min</span>
              {isStarted && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(59,130,246,0.3)', color: '#93c5fd', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>⏱ {formatElapsed(elapsed)}</span>
              )}
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            {!isStarted ? (
              <button onClick={handleStart} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', fontWeight: 700, borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 15, boxShadow: '0 8px 32px rgba(99,102,241,0.5)', fontFamily: 'inherit' }}>
                <Play size={18} fill="#fff" /> Start Simulation
              </button>
            ) : (
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: '14px 20px', textAlign: 'center', minWidth: 120 }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>Step Progress</p>
                <p style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{completedSteps.size} / {steps.length}</p>
                <div style={{ marginTop: 6, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 4 }}>
                  <div style={{ height: 4, borderRadius: 4, background: '#22c55e', width: `${progressPct}%`, transition: 'width 0.4s' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {!isStarted ? (
          /* Pre-launch briefing */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24, width: 'fit-content', border: '1px solid rgba(0,0,0,0.06)' }}>
                {[{ id: 'learn', label: "What you'll learn", icon: <Zap size={13} /> }, { id: 'how', label: 'How it works', icon: <Lightbulb size={13} /> }].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? '#111827' : '#4b5563', boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' }}>
                {activeTab === 'learn'
                  ? <p style={{ color: '#4b5563', fontSize: 15, lineHeight: 1.7 }}>{config.learning_content?.what || config.goal || 'Complete this simulation to practice real-world skills in a safe environment.'}</p>
                  : <p style={{ color: '#4b5563', fontSize: 15, lineHeight: 1.7 }}>Work through each SOP step. Acknowledge each step when done. Hints cost 5 pts and showing the answer costs 10 pts. Once all steps are done, submit for AI feedback.</p>
                }
              </div>
              
              {SAFETY_SIMS.includes(simulationId) && (
                <div style={{ marginTop: 24, borderRadius: 20, overflow: 'hidden', position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', height: 350, border: '1px solid rgba(0,0,0,0.08)', background: '#0f172a' }}>
                  <SimulationPreview3D simulationId={simulationId} />
                  <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', padding: '5px 12px', borderRadius: 20, pointerEvents: 'none' }}>
                    <Play size={12} fill="#fff" style={{ color: '#fff' }} />
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 12 }}>Live 3D Preview</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Target size={15} color="#fff" /></div>
                <div><p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Mission Objectives</p><p style={{ fontSize: 11, color: '#6b7280' }}>{steps.length} steps to complete</p></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {steps.map((step, i) => (
                  <div key={step.step_id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: '#f5f7f8', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff' }}>{i + 1}</div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>{step.instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        ) : (
          /* Active Simulation Runner */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

            {/* LEFT: Current SOP step */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' }}>
                {/* Step header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>{activeStepIndex + 1}</div>
                  <div>
                    <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step {activeStepIndex + 1} of {steps.length}</p>
                    <p style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Active SOP Step</p>
                  </div>
                </div>

                {/* Instruction */}
                <div style={{ background: '#f8fafc', borderRadius: 14, padding: '18px 20px', marginBottom: 20, border: '1px solid rgba(0,0,0,0.06)' }}>
                  <p style={{ fontSize: 15, color: '#1e293b', lineHeight: 1.8, fontWeight: 500 }}>{currentStep?.instruction}</p>
                </div>

                {/* Hint revealed */}
                {revealedHint && currentStep?.hint && (
                  <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>💡 Hint (-5 pts deducted)</p>
                    <p style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>{currentStep.hint}</p>
                  </div>
                )}

                {/* Hint / Help buttons */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
                  {!revealedHint && currentStep?.hint && (
                    <button
                      onClick={() => { setRevealedHint(true); setHintsUsed(prev => [...prev, 'hint']); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', color: '#d97706', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                    >
                      <Lightbulb size={13} /> Get Hint <span style={{ opacity: 0.65, fontWeight: 400 }}>(-5 pts)</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setHintsUsed(prev => [...prev, 'ai_help']);
                      setIsChatOpen(true);
                      if (chatMessages.length === 0) {
                        setChatMessages([{ role: 'ai', text: `I'm here to help with step ${activeStepIndex + 1}: "${currentStep?.instruction}". What would you like to know?` }]);
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'rgba(0,86,210,0.08)', border: '1px solid rgba(0,86,210,0.25)', color: '#0056D2', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                  >
                    <Brain size={13} /> Get Help <span style={{ opacity: 0.65, fontWeight: 400 }}>(-10 pts)</span>
                  </button>
                </div>

                {/* Acknowledgement checkbox */}
                <div
                  onClick={() => !completedSteps.has(currentStep?.step_id) && setAcknowledged(a => !a)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                    background: acknowledged || completedSteps.has(currentStep?.step_id) ? 'rgba(34,197,94,0.07)' : '#f9fafb',
                    border: `2px solid ${acknowledged || completedSteps.has(currentStep?.step_id) ? 'rgba(34,197,94,0.4)' : 'rgba(0,0,0,0.1)'}`,
                    borderRadius: 14, cursor: completedSteps.has(currentStep?.step_id) ? 'default' : 'pointer',
                    transition: 'all 0.2s', userSelect: 'none'
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: 7,
                    border: `2.5px solid ${acknowledged || completedSteps.has(currentStep?.step_id) ? '#22c55e' : '#d1d5db'}`,
                    background: acknowledged || completedSteps.has(currentStep?.step_id) ? '#22c55e' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s'
                  }}>
                    {(acknowledged || completedSteps.has(currentStep?.step_id)) && <CheckCircle size={15} color="#fff" />}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: acknowledged || completedSteps.has(currentStep?.step_id) ? '#15803d' : '#374151' }}>
                      I acknowledge I have completed this step
                    </p>
                    {!acknowledged && !completedSteps.has(currentStep?.step_id) && (
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Required before proceeding to next step</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => { if (activeStepIndex > 0) setActiveStepIndex(i => i - 1); }}
                  disabled={activeStepIndex === 0}
                  style={{ flex: 1, padding: '14px', background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.08)', color: '#374151', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: activeStepIndex === 0 ? 'not-allowed' : 'pointer', opacity: activeStepIndex === 0 ? 0.45 : 1, fontFamily: 'inherit' }}
                >
                  ← Previous
                </button>

                {!isLastStep ? (
                  <button
                    onClick={handleNext}
                    disabled={!acknowledged && !completedSteps.has(currentStep?.step_id)}
                    style={{ flex: 2, padding: '14px', background: (!acknowledged && !completedSteps.has(currentStep?.step_id)) ? '#e5e7eb' : 'linear-gradient(135deg, #3b82f6, #6366f1)', color: (!acknowledged && !completedSteps.has(currentStep?.step_id)) ? '#9ca3af' : '#fff', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', cursor: (!acknowledged && !completedSteps.has(currentStep?.step_id)) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isCompleting || (!acknowledged && !completedSteps.has(currentStep?.step_id))}
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: (isCompleting || (!acknowledged && !completedSteps.has(currentStep?.step_id))) ? '#e5e7eb' : 'linear-gradient(135deg, #22c55e, #16a34a)', color: (isCompleting || (!acknowledged && !completedSteps.has(currentStep?.step_id))) ? '#9ca3af' : '#fff', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {isCompleting
                      ? <><RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Submitting…</>
                      : <><CheckCircle size={15} /> Submit & Get AI Feedback</>
                    }
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT: SOP checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>SOP Checklist</p>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{progressPct}%</span>
                </div>
                <div style={{ height: 5, background: '#f3f4f6', borderRadius: 4, marginBottom: 16 }}>
                  <div style={{ height: 5, borderRadius: 4, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', width: `${progressPct}%`, transition: 'width 0.4s' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {steps.map((step, i) => {
                    const done = completedSteps.has(step.step_id);
                    const active = i === activeStepIndex;
                    const locked = !done && i > activeStepIndex;
                    return (
                      <button
                        key={step.step_id}
                        onClick={() => {
                          if (done || i === activeStepIndex) setActiveStepIndex(i);
                          else if (locked) toast.info('Complete the previous step first.');
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${active ? 'rgba(59,130,246,0.35)' : done ? 'rgba(34,197,94,0.35)' : 'rgba(0,0,0,0.06)'}`, background: active ? 'rgba(59,130,246,0.08)' : done ? 'rgba(34,197,94,0.06)' : '#f9fafb', opacity: locked ? 0.45 : 1, cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? '#22c55e' : active ? '#3b82f6' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: done || active ? '#fff' : '#6b7280' }}>
                          {done ? <CheckCircle size={14} /> : i + 1}
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: active ? '#1d4ed8' : done ? '#15803d' : '#374151', lineHeight: 1.4 }}>
                          {step.instruction?.substring(0, 55)}{step.instruction?.length > 55 ? '…' : ''}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Penalty summary */}
              {hintsUsed.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>⚠️ Score Penalties</p>
                  {hintCount > 0 && <p style={{ fontSize: 12, color: '#b45309', marginBottom: 4 }}>💡 Hints: {hintCount} × 5 = <strong>-{hintCount * 5} pts</strong></p>}
                  {helpCount > 0 && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 4 }}>📖 Help: {helpCount} × 10 = <strong>-{helpCount * 10} pts</strong></p>}
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(239,68,68,0.15)' }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>Total: -{totalPenalty} pts</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating AI Chat */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        {isChatOpen && (
          <div style={{ marginBottom: 12, width: 320, borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 420, background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)' }}>
            {/* Chat header */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #0056D2 0%, #3b82f6 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 700, fontSize: 14 }}>
                <Brain size={16} /> AI Assistant
              </div>
              <button onClick={() => setIsChatOpen(false)} style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ padding: '10px 13px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', maxWidth: '85%', fontSize: 13, lineHeight: 1.55, background: msg.role === 'user' ? '#3b82f6' : '#ffffff', color: msg.role === 'user' ? '#fff' : '#1e293b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: msg.role === 'ai' ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: '#fff', border: '1px solid rgba(0,0,0,0.06)', fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Thinking…
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
            {/* Input */}
            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask for help…"
                style={{ flex: 1, borderRadius: 10, padding: '8px 12px', fontSize: 13, background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)', outline: 'none', fontFamily: 'inherit', color: '#111827' }}
              />
              <button type="submit" disabled={chatLoading || !chatInput.trim()} style={{ width: 36, height: 36, borderRadius: 10, background: '#0056D2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>
                <Send size={14} color="#fff" />
              </button>
            </form>
          </div>
        )}
        <button
          onClick={() => setIsChatOpen(o => !o)}
          style={{ width: 54, height: 54, borderRadius: '50%', background: '#0056D2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,86,210,0.4)', transition: 'transform 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isChatOpen ? <X size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
