/**
 * Engine-Driven Terminal Widget — Full Feature
 *
 * - Objectives tick off in real-time as rules fire (race fixed via deferred sync)
 * - Per-objective Hint + Get Help (AI assistant) buttons
 * - Timed auto-hints from DSL
 * - "Complete Mission" button when all required objectives done
 * - Full-screen mode
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { Terminal, Award, Lightbulb, MessageCircle, CheckCircle2, Circle, ChevronRight, Flag, Maximize2, Minimize2, X, Bot } from "lucide-react";
import { MissionStates } from "../engine/StateManager.js";
import { useSimulationEngine } from "../core/useSimulationEngine.js";
import { SCENARIO_REGISTRY } from "../../scenarios/index.js";
import { askSimulationHelp } from "../../api/geminiApi.js";

// ── AI Help Panel (Powered by Gemini) ────────────────────────────────────────
function AiHelpPanel({ objective, missionTitle, onClose, onUseHelp }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `👋 I'm SimOS Assistant, powered by Gemini AI.\n\nI'm here to help you with:\n"${objective?.description}"\n\nWhat are you stuck on? Ask me anything!`
    }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);
  const penaltyLoggedRef = useRef(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const ask = async () => {
    if (!input.trim() || thinking) return;
    if (!penaltyLoggedRef.current) {
      penaltyLoggedRef.current = true;
      onUseHelp?.();
    }
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setThinking(true);
    try {
      const history = messages.slice(1).map(m => ({ role: m.role, text: m.text }));
      const reply = await askSimulationHelp({
        missionTitle,
        objectiveDescription: objective?.description || '',
        history,
        userMessage: userMsg,
      });
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `⚠️ ${err.message || 'Failed to reach Gemini AI. Check your connection.'}`
      }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 360,
      background: 'linear-gradient(180deg, #0f1a2e 0%, #0a1020 100%)',
      borderLeft: '1px solid rgba(99,102,241,0.3)',
      display: 'flex', flexDirection: 'column', zIndex: 10,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(99,102,241,0.5)' }}>
            <Bot size={16} color="#fff" />
          </div>
          <div>
            <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700, margin: 0 }}>SimOS Assistant</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <p style={{ color: '#64748b', fontSize: 10, margin: 0 }}>Powered by Gemini AI</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}>
          <X size={14} />
        </button>
      </div>

      {/* Objective context pill */}
      {objective?.description && (
        <div style={{ margin: '10px 14px 0', padding: '8px 12px', background: 'rgba(99,102,241,0.15)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.25)' }}>
          <p style={{ color: '#a5b4fc', fontSize: 10, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Objective</p>
          <p style={{ color: '#e2e8f0', fontSize: 11, margin: '3px 0 0', lineHeight: 1.5 }}>{objective.description}</p>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
            background: m.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.06)',
            borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            padding: '10px 13px',
            border: m.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
          }}>
            <p style={{ color: '#e2e8f0', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{m.text}</p>
          </div>
        ))}
        {thinking && (
          <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.06)', borderRadius: '14px 14px 14px 4px', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', animation: `bounce 1.2s ${i*0.2}s infinite` }} />
              ))}
            </div>
            <span style={{ color: '#64748b', fontSize: 11 }}>Gemini is thinking...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick prompts */}
      <div style={{ padding: '8px 14px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {["What should I do first?", "Give me a hint", "Why is this step important?"].map(q => (
          <button key={q} onClick={() => setInput(q)} style={{
            padding: '4px 10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 20, color: '#a5b4fc', fontSize: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
          }}>{q}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, marginTop: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
          placeholder="Ask Gemini for help..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'Inter, sans-serif' }}
        />
        <button onClick={ask} disabled={thinking || !input.trim()} style={{ padding: '9px 16px', background: thinking ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 600, cursor: thinking ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
          Send
        </button>
      </div>
    </div>
  );
}

// ── Main Widget ──────────────────────────────────────────────────────────────
export function EngineTerminalWidget({ missionId, onMissionComplete, onObjectiveCompleted }) {
  const {
    missionState, objectives, score, hints, logs, usedHints, ready, error, beginExecution, executeCommand, recordHint,
    skipObjective,
  } = useSimulationEngine(missionId, { onObjectiveCompleted });

  const [command, setCommand] = useState("");
  const [activeHints, setActiveHints] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [revealedHints, setRevealedHints] = useState(new Set());
  const [helpOpenFor, setHelpOpenFor] = useState(null); // objective id
  const [fullscreen, setFullscreen] = useState(false);
  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs, activeHints]);

  useEffect(() => {
    if (missionState !== MissionStates.EXECUTION) return;
    const timer = setInterval(() => {
      setElapsedSeconds(s => {
        const next = s + 1;
        const triggered = hints.filter(
          h => h.trigger_after_seconds <= next && !activeHints.find(a => a.message === h.message)
        );
        if (triggered.length > 0) setActiveHints(prev => [...prev, ...triggered]);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [missionState, hints, activeHints]);

  useEffect(() => {
    if (ready && !startedRef.current && missionState === MissionStates.BRIEFING) {
      startedRef.current = true;
      beginExecution();
    }
  }, [ready, missionState]);

  useEffect(() => {
    if (missionState === MissionStates.SUCCESS || missionState === MissionStates.FAILURE) {
      onMissionComplete?.({ missionState, score, objectives, hints_used: usedHints });
    }
  }, [missionState]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;
    setCommand("");
    await executeCommand(cmd);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const completedCount = objectives.filter(o => o.completed).length;
  const requiredCount = objectives.filter(o => o.required !== false).length;
  const allRequiredDone = completedCount >= requiredCount && requiredCount > 0;
  const isComplete = missionState === MissionStates.SUCCESS || missionState === MissionStates.FAILURE;

  const scenarioDSL = SCENARIO_REGISTRY[missionId];
  const dslObjectives = scenarioDSL?.objectives || [];
  const dslHints = scenarioDSL?.hints || [];

  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Active objective = first uncompleted one
  const activeObjIndex = objectives.findIndex(o => !o.completed);
  const activeObj = objectives[activeObjIndex] ?? null;

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#080d18', borderRadius: 16, color: '#64748b', fontFamily: 'monospace', fontSize: 13 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Initializing SimOS engine...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#080d18', borderRadius: 16, color: '#f87171', fontFamily: 'monospace', fontSize: 12, padding: 24 }}>
        Engine Error: {error}
      </div>
    );
  }

  const containerStyle = fullscreen ? {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: '#050a14',
    display: 'flex', flexDirection: 'column',
    padding: 0,
  } : {
    display: 'flex', flexDirection: 'column',
    height: '100%',
    background: '#050a14',
    borderRadius: 16,
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle}>
      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#0a0f1c', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Flag size={13} color="#818cf8" />
            <span style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mission</span>
            <span style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px', border: '1px solid rgba(99,102,241,0.3)' }}>
              {completedCount}/{objectives.length} done
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700 }}>⭐ {score} pts</span>
          {missionState === MissionStates.EXECUTION && (
            <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>⏱ {formatTime(elapsedSeconds)}</span>
          )}
          <button
            onClick={() => setFullscreen(f => !f)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
            title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Left: Objectives list */}
        <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {objectives.map((obj, i) => {
            const dslObj = dslObjectives.find(d => d.id === obj.id) || dslObjectives[i];
            const dslHint = dslHints[i];
            const isActive = i === activeObjIndex;
            const hintShown = revealedHints.has(obj.id);
            const helpOpen = helpOpenFor === obj.id;

            return (
              <div key={obj.id} style={{
                borderRadius: 12,
                border: obj.completed
                  ? '1px solid rgba(34,197,94,0.3)'
                  : isActive
                  ? '1px solid rgba(99,102,241,0.4)'
                  : '1px solid rgba(255,255,255,0.05)',
                background: obj.completed
                  ? 'rgba(34,197,94,0.07)'
                  : isActive
                  ? 'rgba(99,102,241,0.09)'
                  : 'rgba(255,255,255,0.02)',
                padding: '10px 12px',
                transition: 'all 0.35s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <div style={{ flexShrink: 0, marginTop: 1, transition: 'all 0.3s' }}>
                    {obj.completed
                      ? <CheckCircle2 size={15} color="#22c55e" />
                      : <Circle size={15} color={isActive ? '#818cf8' : '#334155'} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      color: obj.completed ? '#86efac' : isActive ? '#c7d2fe' : '#475569',
                      fontSize: 12, fontWeight: 600,
                      textDecoration: obj.completed ? 'line-through' : 'none',
                      lineHeight: 1.4,
                      transition: 'all 0.3s',
                    }}>
                      {obj.description}
                    </p>

                    {/* Action buttons for active step */}
                    {isActive && !obj.completed && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {!hintShown && dslHint && (
                          <button
                            onClick={() => {
                              setRevealedHints(prev => new Set([...prev, obj.id]));
                              recordHint('hint');
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#93c5fd', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                          >
                            <Lightbulb size={10} /> Hint (-5 pts)
                          </button>
                        )}
                        <button
                          onClick={() => setHelpOpenFor(helpOpen ? null : obj.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: helpOpen ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 8, color: '#c4b5fd', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                        >
                          <MessageCircle size={10} /> Get Help
                        </button>
                      </div>
                    )}

                    {/* Hint reveal */}
                    {hintShown && dslHint && !obj.completed && (
                      <div style={{ marginTop: 8, padding: '7px 10px', background: 'rgba(59,130,246,0.1)', borderLeft: '3px solid #3b82f6', borderRadius: '0 8px 8px 0', color: '#93c5fd', fontSize: 11, lineHeight: 1.5 }}>
                        💡 {dslHint.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Timed auto-hints */}
          {activeHints.map((hint, idx) => (
            <div key={`auto-${idx}`} style={{ marginTop: 4, padding: '8px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#a5b4fc', fontSize: 11 }}>
              ⏰ {hint.message}
            </div>
          ))}

          {/* Skip SOP and Submit Attempt buttons */}
          {!isComplete && (
            <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => {
                  // Mark the current active objective as skipped and move to the next one.
                  // If this was the last objective, submit the attempt.
                  if (typeof skipObjective === 'function') {
                    skipObjective();
                  } else {
                    // Fallback: fire mission complete with current score as a skip
                    onMissionComplete?.({ missionState: MissionStates.FAILURE, score, objectives });
                  }
                }}
                style={{
                  width: '100%', padding: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff', fontWeight: 700, borderRadius: 12,
                  border: 'none', cursor: 'pointer', fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Skip SOP
              </button>
              <button
                onClick={() => onMissionComplete?.({ missionState: MissionStates.SUCCESS, score, objectives })}
                style={{
                  width: '100%', padding: '12px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff', fontWeight: 700, borderRadius: 12,
                  border: 'none', cursor: 'pointer', fontSize: 13,
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: allRequiredDone ? '0 4px 20px rgba(34,197,94,0.4)' : 'none',
                  animation: allRequiredDone ? 'pulse-green 2s infinite' : 'none',
                }}
              >
                <Award size={15} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
                Submit Attempt {score > 0 ? `— ${score} pts` : ''}
              </button>
            </div>
          )}
        </div>

        {/* Right: Terminal */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Terminal chrome header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#0d1220', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
              </div>
              <span style={{ color: '#334155', fontSize: 11, fontFamily: 'monospace' }}>
                <Terminal size={10} style={{ display: 'inline', marginRight: 5 }} />
                {missionId}
              </span>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
              background: isComplete ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
              color: isComplete ? '#86efac' : '#a5b4fc',
              border: `1px solid ${isComplete ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
            }}>
              {missionState}
            </span>
          </div>

          {/* Terminal output */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {logs.map((log, idx) => (
              <div key={idx} style={{
                fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                color: log.startsWith('$') ? '#4ade80'
                  : log.startsWith('⚠') ? '#fbbf24'
                  : (log.startsWith('SimOS') || log.startsWith('Mission') || log.startsWith('Provider') || log.startsWith('Type'))
                  ? '#818cf8'
                  : '#94a3b8',
              }}>
                {log}
              </div>
            ))}
            {isComplete && (
              <div style={{
                marginTop: 12, padding: '12px 16px', borderRadius: 12,
                borderColor: missionState === MissionStates.SUCCESS ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
                border: '1px solid',
                background: missionState === MissionStates.SUCCESS ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                color: missionState === MissionStates.SUCCESS ? '#86efac' : '#fca5a5',
                fontFamily: 'monospace', fontSize: 13, fontWeight: 700, textAlign: 'center',
              }}>
                {missionState === MissionStates.SUCCESS ? `🎉 Mission Complete! Score: ${score} pts` : '❌ Mission Failed.'}
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Input */}
          {!isComplete && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#080c16', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#4ade80', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>$</span>
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={e => setCommand(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontFamily: 'monospace', fontSize: 12, padding: 0 }}
                placeholder="Enter command..."
                autoFocus
              />
              <ChevronRight size={14} color="#334155" />
            </form>
          )}

          {/* AI Help Panel overlay */}
          {helpOpenFor && (
            <AiHelpPanel
              objective={objectives.find(o => o.id === helpOpenFor)}
              missionTitle={missionId}
              onClose={() => setHelpOpenFor(null)}
              onUseHelp={() => recordHint('ai_help')}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 4px 20px rgba(34,197,94,0.4); }
          50% { box-shadow: 0 4px 28px rgba(34,197,94,0.65); }
        }
      `}</style>
    </div>
  );
}
