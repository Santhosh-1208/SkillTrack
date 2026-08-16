import { useEffect, useMemo, useState } from "react";
import {
  Zap,
  Bell,
  Award,
  ArrowUp,
  Check,
  Play,
  TrendingUp,
  Target,
  BookOpen,
} from "lucide-react";
import { simulationsApi } from "../../api/simulationsApi";
import { attemptsApi } from "../../api/attemptsApi";
import { notificationsApi } from "../../api/notificationsApi";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { Badge, CircularProgress, StatCard } from "../components/shared/atoms";
import { trackEvent } from "../../lib/metrics";
import { BackendErrorNotice } from "../components/shared/atoms";

function levelLabel(level) {
  if (level <= 1) return "Easy";
  if (level === 2) return "Medium";
  return "Hard";
}

function formatRelativeDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function LearnerDashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [simulations, setSimulations] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [backendError, setBackendError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      simulationsApi.list().catch((e) => { setBackendError(e.message); return []; }),
      attemptsApi.listForLearner(user.id).catch(() => []),
      notificationsApi.listForUser(user.id).catch(() => []),
    ])
      .then(([sims, atts, notifs]) => {
        // Hide drafts and pending approvals from learners
        const activeSims = sims.filter(sim => !sim.status || sim.status === "Active");
        setSimulations(activeSims);
        setAttempts(atts);
        setUnreadCount(notifs.filter(n => !n.read).length);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const completed = useMemo(
    () => attempts.filter((a) => a.status === "completed" || a.final_score),
    [attempts],
  );

  const attemptedIds = useMemo(() => new Set(attempts.map((a) => a.simulation_id)), [attempts]);

  const avgScore = useMemo(() => {
    const scores = completed.map((a) => a.final_score?.overall_score).filter((s) => s != null);
    if (!scores.length) return null;
    return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  }, [completed]);

  const recent = useMemo(() => {
    const sorted = [...completed].sort((a, b) => new Date(b.ended_at || b.started_at) - new Date(a.ended_at || a.started_at));
    const unique = [];
    const seen = new Set();
    for (const a of sorted) {
      if (!seen.has(a.simulation_id)) {
        seen.add(a.simulation_id);
        const sim = simulations.find((s) => s.simulation_id === a.simulation_id);
        unique.push({
          id: a._id || a.id || a.attempt_id,
          name: sim?.title || a.simulation_id,
          score: Math.round(a.final_score?.overall_score ?? 0),
          date: formatRelativeDate(a.ended_at || a.started_at),
        });
        if (unique.length === 4) break;
      }
    }
    return unique;
  }, [completed, simulations]);

  const unattempted = useMemo(() => {
    const un = simulations.filter((s) => !attemptedIds.has(s.simulation_id));
    // Shuffle deterministically based on today's date so it changes daily but doesn't flicker
    const seed = new Date().toDateString().split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return un.sort((a, b) => {
       const aSeed = a.simulation_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
       const bSeed = b.simulation_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
       return ((aSeed + seed) % 10) - ((bSeed + seed) % 10);
    });
  }, [simulations, attemptedIds]);

  // Group simulations by domain/category for Progress by Domain
  const domainProgress = useMemo(() => {
    const domainMap = {};
    simulations.forEach(sim => {
      const domain = sim.category || sim.branch || sim.interaction_pattern || "General";
      if (!domainMap[domain]) domainMap[domain] = { sims: [], completed: 0, totalScore: 0, count: 0 };
      domainMap[domain].sims.push(sim);
      const attemptsForSim = completed.filter(a => a.simulation_id === sim.simulation_id);
      if (attemptsForSim.length > 0) {
        const best = Math.max(...attemptsForSim.map(a => a.final_score?.overall_score ?? a.score ?? 0));
        domainMap[domain].completed++;
        domainMap[domain].totalScore += best;
        domainMap[domain].count++;
      }
    });
    return Object.entries(domainMap).map(([name, data]) => ({
      name,
      total: data.sims.length,
      completed: data.completed,
      avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
      pct: data.sims.length > 0 ? Math.round((data.completed / data.sims.length) * 100) : 0,
      sims: data.sims,
    })).sort((a, b) => b.completed - a.completed);
  }, [simulations, completed]);

  const progressPct = simulations.length
    ? Math.round((new Set(completed.map((a) => a.simulation_id)).size / simulations.length) * 100)
    : 0;

  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "?";

  if (loading) {
    return <div className="p-5 text-sm text-gray-500">Loading dashboard…</div>;
  }

  return (
    <div className="p-5 space-y-4" style={{ background: '#f5f7f8', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {backendError && (
        <BackendErrorNotice>
          {backendError} Simulations and attempt stats may be incomplete.
        </BackendErrorNotice>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Hi {user?.name?.split(" ")[0] || "Learner"}</h1>
          <p className="text-sm" style={{ color: '#4b5563' }}>Continue your safety training progress.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("notifications")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors relative"
            style={{ background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <Bell size={16} color="#4b5563" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            {initial}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Simulations Completed"
          value={completed.length}
          sub={simulations.length ? `${simulations.length} available` : "—"}
          icon={Zap}
          color="#3B6EF5"
        />
        <div className="rounded-xl p-4 shadow-sm" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <p className="text-xs mb-2" style={{ color: '#4b5563' }}>AI Score</p>
          <div className="flex items-center gap-2">
            <p className="text-[22px] font-bold leading-none" style={{ color: '#111827' }}>{avgScore != null ? `${avgScore}%` : "—"}</p>
            {avgScore != null && avgScore >= 80 && (
              <span className="text-xs flex items-center gap-0.5 font-semibold" style={{ color: '#22c55e' }}>
                <ArrowUp size={10} />
                avg
              </span>
            )}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: '#6b7280' }}>{avgScore != null ? "From completed runs" : "Complete a simulation"}</p>
        </div>
        <StatCard label="Badges Earned" value={completed.filter((a) => a.final_score?.passed).length} sub="Passed simulations" icon={Award} color="#F59E0B" />
        <div className="rounded-xl p-4 shadow-sm flex items-center gap-4" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="relative flex items-center justify-center shrink-0">
            <CircularProgress value={progressPct} size={72} strokeWidth={7} color="#22C55E" />
            <div className="absolute text-center">
              <p className="text-base font-bold leading-none" style={{ color: '#111827' }}>{progressPct}%</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>Progress</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>Overall completion</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4 shadow-sm" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>{"Today's Task"}</h3>
          <div className="space-y-2.5">
            {(unattempted.length ? unattempted.slice(0, 4) : simulations.slice(0, 4)).map((sim) => {
              const done = attemptedIds.has(sim.simulation_id);
              return (
                <div 
                  key={sim.simulation_id} 
                  className={`flex items-center gap-2.5 ${!done ? 'cursor-pointer hover:bg-gray-50' : ''} p-1.5 -ml-1.5 rounded-lg transition-colors`}
                  onClick={() => {
                    if (!done) {
                      trackEvent('simulation_start', { userId: user?.id, source: 'learner_dashboard' });
                      onNavigate("simulation-detail", { id: sim.simulation_id });
                    }
                  }}
                >
                  <div
                    className={`rounded-full flex items-center justify-center shrink-0 ${done ? "bg-emerald-500" : ""}`}
                    style={{ width: 18, height: 18, border: done ? "none" : "2px solid rgba(0,0,0,0.1)" }}
                  >
                    {done && <Check size={10} className="text-white" />}
                  </div>
                  <span className={`text-xs ${done ? "line-through text-gray-400" : "text-gray-600 font-medium"}`}>{sim.title}</span>
                </div>
              );
            })}
            {!simulations.length && <p className="text-xs" style={{ color: '#6b7280' }}>No simulations loaded.</p>}
          </div>
          {unattempted.length > 0 && (
            <button
              onClick={() => {
                trackEvent('simulation_start', { userId: user?.id, source: 'learner_dashboard' });
                onNavigate("simulation-detail", { id: unattempted[0].simulation_id });
              }}
              className="mt-4 w-full py-2 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
            >
              <Play size={12} fill="#ffffff" /> Start {unattempted[0].title.slice(0, 15)}...
            </button>
          )}
        </div>

        <div className="rounded-xl p-4 shadow-sm" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Recent Simulations</h3>
          <div className="space-y-3">
            {recent.length ? (
              recent.map(({ id, name, score, date }) => (
                <div key={id} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#111827' }}>{name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>{date}</p>
                  </div>
                  <span className={`text-sm font-bold ${score >= 90 ? "text-emerald-500" : score >= 80 ? "text-blue-500" : "text-amber-500"}`}>
                    {score}%
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs" style={{ color: '#6b7280' }}>No completed simulations yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress by Domain ── Full width, real-time from attempts ── */}
      <div className="rounded-xl p-5 shadow-sm" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#3b82f615' }}>
              <TrendingUp size={14} style={{ color: '#3b82f6' }} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: '#111827' }}>Progress by Domain</h3>
          </div>
          <span className="text-xs font-medium" style={{ color: '#6b7280' }}>
            {new Set(completed.map(a => a.simulation_id)).size} of {simulations.length} completed
          </span>
        </div>

        {domainProgress.length === 0 ? (
          <p className="text-xs" style={{ color: '#6b7280' }}>No domain data yet. Complete a simulation to see your progress.</p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(domainProgress.length, 3)}, 1fr)` }}>
            {domainProgress.map((domain) => {
              const color = domain.pct >= 75 ? '#22c55e' : domain.pct >= 40 ? '#3b82f6' : domain.pct > 0 ? '#f59e0b' : '#d1d5db';
              const gradient = domain.pct >= 75
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : domain.pct >= 40
                ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                : domain.pct > 0
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : '#e5e7eb';
              return (
                <div key={domain.name} className="rounded-xl p-4" style={{ background: '#f9fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
                  {/* Domain header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: color + '18' }}>
                        <BookOpen size={11} style={{ color }} />
                      </div>
                      <span className="text-xs font-bold truncate" style={{ color: '#111827', maxWidth: 120 }}>{domain.name}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color }}>{domain.pct}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: '#e5e7eb' }}>
                    <div
                      className="h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${domain.pct}%`, background: gradient }}
                    />
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Target size={10} style={{ color: '#6b7280' }} />
                      <span className="text-[10px]" style={{ color: '#6b7280' }}>{domain.completed}/{domain.total} done</span>
                    </div>
                    {domain.avgScore > 0 && (
                      <span className="text-[10px] font-semibold" style={{ color }}>
                        Avg {domain.avgScore}%
                      </span>
                    )}
                  </div>

                  {/* Individual sims mini-list */}
                  <div className="mt-3 space-y-1.5">
                    {domain.sims.slice(0, 3).map(sim => {
                      const simAttempts = completed.filter(a => a.simulation_id === sim.simulation_id);
                      const best = simAttempts.length > 0
                        ? Math.round(Math.max(...simAttempts.map(a => a.final_score?.overall_score ?? a.score ?? 0)))
                        : null;
                      const done = attemptedIds.has(sim.simulation_id);
                      return (
                        <div key={sim.simulation_id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500' : ''}`}
                              style={{ border: done ? 'none' : '1.5px solid #d1d5db' }}>
                              {done && <Check size={8} color="#fff" />}
                            </div>
                            <span className="text-[10px] truncate" style={{ color: done ? '#111827' : '#9ca3af' }}>{sim.title}</span>
                          </div>
                          {best !== null && (
                            <span className="text-[10px] font-bold shrink-0" style={{ color: best >= 80 ? '#22c55e' : best >= 60 ? '#3b82f6' : '#f59e0b' }}>
                              {best}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {domain.sims.length > 3 && (
                      <p className="text-[9px]" style={{ color: '#9ca3af' }}>+{domain.sims.length - 3} more scenarios</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
