import { useEffect, useState, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertTriangle, Brain, CheckCircle, XCircle, Clock, Target,
  TrendingUp, Award, BookOpen, ChevronRight, Zap, Shield,
  Trash2, Sparkles, MessageSquare, Send, X, Bot
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { attemptsApi } from "../../api/attemptsApi";
import { simulationsApi } from "../../api/simulationsApi";
import { CircularProgress } from "../components/shared/atoms";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { generateDetailedFeedback, askSkillTrackAssistant } from "../../api/geminiApi";
import { usersApi } from "../../api/usersApi";

const SEVERITY_CONFIG = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", label: "Critical" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", label: "High" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.1)",  border: "rgba(234,179,8,0.3)",  label: "Medium" },
  low:      { color: "#4b5563", bg: "rgba(0,0,0,0.03)",     border: "rgba(0,0,0,0.06)",      label: "Low" },
};

function formatDuration(seconds) {
  if (!seconds) return "-";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function ScoreBadge({ score }) {
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#3b82f6" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs Work";
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: color + "20", color }}>
      {label}
    </span>
  );
}

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export function AIFeedbackPage({ onNavigate, attempt: attemptProp }) {
  const { user } = useAuth();
  const [allAttempts, setAllAttempts] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  // Gemini AI state
  const [geminiAnalysis, setGeminiAnalysis] = useState(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatThinking, setChatThinking] = useState(false);
  const chatEndRef = useRef(null);
  const [deleteAttemptTarget, setDeleteAttemptTarget] = useState(null);

  // Trainer: learner selector
  const [learners, setLearners] = useState([]);
  const [selectedLearner, setSelectedLearner] = useState(null);

  useEffect(() => {
    if (user?.role === "trainer") {
      usersApi.list("learner", user.id).then(setLearners).catch(() => []);
    }
  }, [user?.role, user?.id]);

  const targetUserId = user?.role === "trainer" ? selectedLearner?.id : user?.id;

  useEffect(() => {
    if (!targetUserId) {
      setAllAttempts([]);
      setSelectedAttempt(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      attemptsApi.listForLearner(targetUserId).catch(() => []),
      simulationsApi.list().catch(() => []),
    ]).then(([attempts, sims]) => {
      const completed = attempts.filter(a => a.status === "completed" || a.final_score != null || a.score != null);
      completed.sort((a, b) => new Date(b.ended_at || b.started_at) - new Date(a.ended_at || a.started_at));
      setAllAttempts(completed);
      setSimulations(sims);
      if (attemptProp?.attempt_id) {
        const found = completed.find(a => a.attempt_id === attemptProp.attempt_id || a.id === attemptProp.attempt_id);
        setSelectedAttempt(found || attemptProp || completed[0] || null);
      } else {
        setSelectedAttempt(completed[0] || null);
      }
    }).finally(() => setLoading(false));
  }, [targetUserId, attemptProp]);

  useEffect(() => {
    setGeminiAnalysis(null);
    setChatMessages([{
      role: 'assistant',
      text: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your SkillTrack AI coach. Once you select an attempt, ask me anything about your performance, how to improve, or what to study next!`
    }]);
  }, [selectedAttempt?.attempt_id, selectedAttempt?.id, targetUserId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const simMap = useMemo(() => {
    const m = {};
    simulations.forEach(s => { m[s.simulation_id] = s; });
    return m;
  }, [simulations]);

  const getTitle = (attempt) => simMap[attempt?.simulation_id]?.title || attempt?.simulation_title || attempt?.simulation_id || "Simulation Run";
  const getCategory = (attempt) => simMap[attempt?.simulation_id]?.category || "Interactive Simulation";

  const score = selectedAttempt?.final_score;
  const overall = Math.round(score?.overall_score ?? 0);
  const passed = score?.passed;
  // When score_override=100 was used (SOP-based simulations), filter out decision-point artifacts
  const rawScoreOverridden = score?.overall_score != null && (selectedAttempt?.score_override != null || score?.overall_score >= 100 - (score?.hint_penalty ?? 0));
  const allMistakes = selectedAttempt?.mistakes_made || [];
  const mistakes = rawScoreOverridden
    ? allMistakes.filter(m => !((m.mistake_id || '').toLowerCase().includes('decision') || (m.description || '').toLowerCase().includes('decision point') || (m.description || '').toLowerCase().includes('bypassed decision')))
    : allMistakes;
  const allExplanations = score?.ai_explanations || [];
  const explanations = rawScoreOverridden
    ? allExplanations.filter(line => !line.toLowerCase().includes('decision point') && !line.toLowerCase().includes('bypassed decision'))
    : allExplanations;
  const competencies = score?.competency_scores || {};
  const recommended = score?.recommended_next_simulations || [];
  const rawHintsArray = Array.isArray(selectedAttempt?.hints_used) ? selectedAttempt.hints_used : [];
  const rawRegFromArr = rawHintsArray.filter(h => h === 'hint' || (typeof h === 'object' && h.type === 'hint')).length;
  const rawAiFromArr = rawHintsArray.filter(h => h === 'ai_help' || (typeof h === 'object' && h.type === 'ai_help')).length;

  const aiHelpCount = score?.ai_help_count ?? selectedAttempt?.ai_help_count ?? rawAiFromArr;
  const hintsUsedTotal = score?.hints_used_count ?? selectedAttempt?.hints_used_count ?? (rawHintsArray.length || (rawRegFromArr + rawAiFromArr));
  const regularHintCount = score?.regular_hint_count ?? selectedAttempt?.regular_hint_count ?? (rawRegFromArr || Math.max(0, hintsUsedTotal - aiHelpCount));
  const hintsUsed = Math.max(hintsUsedTotal, regularHintCount + aiHelpCount);
  const hintPenalty = score?.hint_penalty ?? selectedAttempt?.hint_penalty ?? (regularHintCount * 5 + aiHelpCount * 10);
  const totalPenalty = Math.max(score?.total_penalty ?? 0, hintPenalty);

  const passThreshold = score?.pass_threshold ?? 70;
  const timeTaken = selectedAttempt?.total_time_seconds;
  const stepsCompleted = selectedAttempt?.actions?.filter(a => a.action_type === "step_completed")?.length ?? 0;

  const handleGenerateGeminiAnalysis = async () => {
    if (!selectedAttempt || geminiLoading) return;
    setGeminiLoading(true);
    try {
      const text = await generateDetailedFeedback({
        simulationTitle: getTitle(selectedAttempt),
        simulationCategory: getCategory(selectedAttempt),
        score: overall,
        passed,
        mistakes,
        competencies,
        hintsUsed,
        timeTaken,
      });
      setGeminiAnalysis(text);
    } catch (e) {
      setGeminiAnalysis(`⚠️ Could not generate analysis: ${e.message}`);
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatThinking) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatThinking(true);
    try {
      const contextMsg = selectedAttempt
        ? `[Context: Learner scored ${overall}% on "${getTitle(selectedAttempt)}". Mistakes: ${mistakes.length}. Passed: ${passed}] ${userMsg}`
        : userMsg;
      const history = chatMessages.slice(1).map(m => ({ role: m.role, text: m.text }));
      const reply = await askSkillTrackAssistant({
        history,
        userMessage: contextMsg,
        userName: user?.name,
        userRole: user?.role,
      });
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${e.message}` }]);
    } finally {
      setChatThinking(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading feedback history…</div>;

  return (
    <>
    <div className="flex h-full" style={{ fontFamily: "Inter, sans-serif", background: "#f5f7f8" }}>
      {/* ── Left history / learner panel ── */}
      <div className="w-64 shrink-0 border-r border-gray-100 bg-white overflow-y-auto flex flex-col">
        {/* Trainer learner selector */}
        {user?.role === "trainer" && (
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Select Learner</p>
            <select
              value={selectedLearner?.id || ""}
              onChange={e => {
                const l = learners.find(x => x.id === e.target.value);
                setSelectedLearner(l || null);
              }}
              className="w-full text-sm rounded-lg px-3 py-2 border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">— Pick a learner —</option>
              {learners.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Attempt history list */}
        <div className="flex-1 p-4 overflow-y-auto">
          {targetUserId ? (
            <>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                {user?.role === "trainer" ? `${selectedLearner?.name?.split(' ')[0]}'s History` : "My History"}
              </p>
              {allAttempts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Brain size={28} className="text-gray-300 mb-3" />
                  <p className="text-xs text-gray-400">No completed simulations yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allAttempts.map(attempt => {
                    const sc = Math.round(attempt.final_score?.overall_score ?? 0);
                    const selected = selectedAttempt?.attempt_id === attempt.attempt_id;
                    return (
                      <div key={attempt.attempt_id} className={`relative group rounded-xl border transition-all ${selected ? "bg-blue-50 border-blue-200" : "border-gray-100 hover:bg-gray-50"}`}>
                        <button
                          onClick={() => setSelectedAttempt(attempt)}
                          className="w-full text-left p-3"
                        >
                          <p className="text-xs font-semibold text-gray-800 truncate mb-1 pr-5">{getTitle(attempt)}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400">{formatDate(attempt.ended_at)}</span>
                            <span className={`text-xs font-bold ${sc >= 80 ? "text-emerald-600" : sc >= 50 ? "text-amber-500" : "text-red-500"}`}>{sc}%</span>
                          </div>
                          <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-1 rounded-full" style={{ width: `${sc}%`, background: sc >= 80 ? "#22c55e" : sc >= 50 ? "#f59e0b" : "#ef4444" }} />
                          </div>
                        </button>
                        {/* Delete button — appears on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteAttemptTarget(attempt);
                          }}
                          title="Delete this attempt"
                          className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Brain size={28} className="text-gray-300 mb-3" />
              <p className="text-xs text-gray-400">
                {user?.role === "trainer" ? "Select a learner above to view their simulation feedback." : "No attempts found."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!targetUserId ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Brain size={28} className="text-blue-400" />
            </div>
            <h1 className="text-lg font-bold text-gray-800 mb-2">AI Support</h1>
            <p className="text-sm text-gray-500">Select a learner from the sidebar to view their simulation feedback.</p>
          </div>
        ) : allAttempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Brain size={28} className="text-blue-400" />
            </div>
            <h1 className="text-lg font-bold text-gray-800 mb-2">No Completed Simulations</h1>
            <p className="text-sm text-gray-500 mb-5">
              {user?.role === "trainer"
                ? `${selectedLearner?.name} hasn't completed any simulations yet.`
                : "Complete a simulation to receive AI-powered scoring and analysis."}
            </p>
            {user?.role !== "trainer" && (
              <button onClick={() => onNavigate("simulation")} className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">
                Browse Simulations
              </button>
            )}
          </div>
        ) : !selectedAttempt || !score ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">Select a simulation from the left.</div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{getTitle(selectedAttempt)}</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {getCategory(selectedAttempt)} · Completed {formatDate(selectedAttempt.ended_at)}
                  {user?.role === "trainer" && selectedLearner && <span className="ml-2 font-medium text-blue-500">· {selectedLearner.name}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {passed ? "✓ Passed" : "✗ Not Passed"}
                </span>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Target,        label: "Score",      value: `${overall}%`,              sub: `Pass: ${passThreshold}%`,              color: overall >= passThreshold ? "#22c55e" : "#ef4444" },
                { icon: Clock,         label: "Time Taken", value: formatDuration(timeTaken),   sub: "Total duration",                       color: "#3b82f6" },
                { icon: Zap,           label: "Steps Done", value: stepsCompleted,              sub: "Correct actions",                      color: "#8b5cf6" },
                { icon: AlertTriangle, label: "Penalties",  value: `-${Math.round(totalPenalty)}pts`, sub: hintsUsed > 0 ? `${regularHintCount} hint(s), ${aiHelpCount} AI help` : `${mistakes.length} issue(s)`, color: mistakes.length === 0 && hintPenalty === 0 ? "#22c55e" : "#f97316" },
              ].map(({ icon: Icon, label, value, sub, color }) => (
                <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "15" }}>
                      <Icon size={14} style={{ color }} />
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{label}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {/* Hints & Get Help usage breakdown card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3" style={{ background: hintsUsed > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <Shield size={15} className={hintsUsed > 0 ? "text-amber-500" : "text-emerald-500"} />
                <h3 className="text-sm font-bold text-gray-800">Hint & Get Help Usage</h3>
                <span className={`ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full border ${hintPenalty > 0 ? "text-red-600 bg-red-50 border-red-200" : "text-emerald-600 bg-emerald-50 border-emerald-200"}`}>
                  -{Math.round(hintPenalty)} pts penalty
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                <div className="p-4 text-center">
                  <p className="text-2xl font-black text-amber-600">{hintsUsed}</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">Total Assistance Used</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-2xl font-black text-blue-500">{regularHintCount}</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">Hints (-5 pts each)</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-2xl font-black text-purple-500">{aiHelpCount}</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">Get Help (-10 pts each)</p>
                </div>
              </div>
            </div>

            {/* Score ring + Competencies */}
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center mb-3">
                  <CircularProgress value={overall} size={120} strokeWidth={10} color={overall >= passThreshold ? "#22c55e" : "#ef4444"} />
                  <div className="absolute text-center">
                    <p className="text-3xl font-black text-gray-900 leading-none">{overall}</p>
                    <p className="text-xs text-gray-400">/100</p>
                  </div>
                </div>
                <ScoreBadge score={overall} />
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {passed ? "Well done! You cleared the pass mark." : `Need ${passThreshold - overall} more points to pass.`}
                </p>
              </div>

              <div className="col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={15} className="text-blue-500" />
                  <h3 className="text-sm font-bold text-gray-800">Competency Breakdown</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(competencies).map(([name, val]) => {
                    const barColor = val >= 85 ? "#22c55e" : val >= 70 ? "#3b82f6" : val >= 50 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">{name}</span>
                          <span className="text-xs font-bold" style={{ color: barColor }}>{Math.round(val)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${val}%`, background: barColor }} />
                        </div>
                      </div>
                    );
                  })}
                  {!Object.keys(competencies).length && <p className="text-xs text-gray-400">No competency data available.</p>}
                </div>
              </div>
            </div>

            {/* Gemini AI Analysis */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    <Sparkles size={13} color="#fff" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">Gemini AI Deep Analysis</h3>
                </div>
                <div className="flex items-center gap-2">
                  {geminiAnalysis && (
                    <button onClick={() => setGeminiAnalysis(null)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                  <button
                    onClick={handleGenerateGeminiAnalysis}
                    disabled={geminiLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all"
                    style={{ background: geminiLoading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', opacity: geminiLoading ? 0.7 : 1 }}
                  >
                    <Sparkles size={12} />
                    {geminiLoading ? "Analyzing…" : geminiAnalysis ? "Regenerate" : "Generate Analysis"}
                  </button>
                </div>
              </div>
              {geminiAnalysis ? (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown components={{
                    p: ({node, ...props}) => <p className="mb-2 text-sm leading-relaxed" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1 text-sm" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-sm" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-900 mt-3 mb-1" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm font-bold text-gray-800 mt-2 mb-1" {...props} />,
                  }}>{geminiAnalysis}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Click "Generate Analysis" to get a personalised Gemini AI deep-dive into this attempt.</p>
              )}
            </div>

            {/* AI Explanations */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Brain size={14} className="text-blue-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">AI Performance Analysis</h3>
              </div>
              <div className="space-y-2">
                {explanations.length ? explanations.map((line, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                    <p className="text-xs text-blue-900 leading-relaxed">{line}</p>
                  </div>
                )) : <p className="text-xs text-gray-400">No analysis available.</p>}
              </div>
            </div>

            {/* Mistakes */}
            {mistakes.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                    <AlertTriangle size={14} className="text-red-500" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">Mistakes & Violations ({mistakes.length})</h3>
                </div>
                <div className="space-y-3">
                  {mistakes.map((m, i) => {
                    const sev = SEVERITY_CONFIG[m.severity] || SEVERITY_CONFIG.low;
                    return (
                      <div key={i} className="p-4 rounded-xl border" style={{ background: sev.bg, borderColor: sev.border }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: sev.color + "20", color: sev.color }}>{sev.label}</span>
                            <span className="text-xs text-gray-500 font-mono">{m.mistake_id}</span>
                          </div>
                          {m.penalty > 0 && <span className="text-xs font-bold text-red-600">-{m.penalty} pts</span>}
                        </div>
                        {m.description && <p className="text-xs font-semibold text-gray-800 mb-1">{m.description}</p>}
                        {m.consequence && <p className="text-xs text-gray-600">⚠ {m.consequence}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hints and Help used — now shown as detailed breakdown above, removed the old banner */}

            {/* Recommended next */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                  <BookOpen size={14} className="text-purple-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Recommended Next Simulations</h3>
              </div>
              <div className="space-y-3">
                {(recommended.length > 0
                  ? recommended.map(id => simMap[id]).filter(Boolean)
                  : simulations.filter(s => s.simulation_id !== selectedAttempt?.simulation_id && s.category === getCategory(selectedAttempt)).slice(0, 3)
                ).map(sim => (
                  <div key={sim.simulation_id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <BookOpen size={16} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{sim.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{sim.category} · Level {sim.level}</p>
                      </div>
                    </div>
                    <button onClick={() => onNavigate("simulation-detail", { simulationId: sim.simulation_id })} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0">
                      Start <ChevronRight size={12} />
                    </button>
                  </div>
                ))}
                {recommended.length === 0 && simulations.filter(s => s.simulation_id !== selectedAttempt?.simulation_id && s.category === getCategory(selectedAttempt)).length === 0 && (
                  <p className="text-xs text-gray-400">No other simulations in this category.</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-4">
              {user?.role !== "trainer" && (
                <button onClick={() => onNavigate("learner-dashboard")} className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors">
                  Dashboard
                </button>
              )}
              <button onClick={() => setChatOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-md" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <MessageSquare size={15} /> Ask AI Coach
              </button>
              <button onClick={() => onNavigate("reports")} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                Full Reports
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating AI Chat ── */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[520px] rounded-2xl flex flex-col z-50 shadow-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ background: '#f3f4f6', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <Bot size={15} color="#fff" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">SkillTrack AI Coach</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <p className="text-[10px] text-gray-500">Powered by Gemini AI</p>
                </div>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-3 p-4 overflow-y-auto flex-1" style={{ background: '#f9fafb' }}>
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: m.role === 'user' ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'rgba(0,0,0,0.05)',
                    color: m.role === 'user' ? '#fff' : '#4b5563',
                    border: m.role === 'assistant' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  }}
                >
                  {m.role === 'assistant' ? (
                    <ReactMarkdown components={{
                      p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-gray-800" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-1 space-y-0.5" {...props} />,
                    }}>{m.text}</ReactMarkdown>
                  ) : m.text}
                </div>
              </div>
            ))}
            {chatThinking && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl flex gap-1.5 items-center" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-indigo-400" style={{ animation: `bounce 1.2s ${i*0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex gap-2 p-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: '#ffffff' }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChatSend()}
              placeholder="Ask a question…"
              className="flex-1 text-sm px-4 py-3 rounded-xl outline-none"
              style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', color: '#111827' }}
            />
            <button
              onClick={handleChatSend}
              disabled={chatThinking || !chatInput.trim()}
              className="p-3 rounded-xl text-white transition-all flex items-center justify-center w-12"
              style={{ background: chatThinking ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            >
              <Send size={16} color={chatThinking ? '#a5b4fc' : '#fff'} />
            </button>
          </div>
        </div>
      )}
    </div>

      <AlertDialog open={!!deleteAttemptTarget} onOpenChange={(open) => { if (!open) setDeleteAttemptTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attempt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attempt for <strong>&ldquo;{deleteAttemptTarget ? getTitle(deleteAttemptTarget) : ''}&rdquo;</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteAttemptTarget) return;
                await attemptsApi.remove(deleteAttemptTarget.attempt_id);
                setAllAttempts(prev => prev.filter(a => a.attempt_id !== deleteAttemptTarget.attempt_id));
                if (selectedAttempt?.attempt_id === deleteAttemptTarget.attempt_id) {
                  const remaining = allAttempts.filter(a => a.attempt_id !== deleteAttemptTarget.attempt_id);
                  setSelectedAttempt(remaining[0] || null);
                }
                setDeleteAttemptTarget(null);
              }}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
