import { useEffect, useState } from "react";
import { Trophy, Star, Zap, Shield, Target, Clock } from "lucide-react";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { attemptsApi } from "../../api/attemptsApi";

// Rules for earning achievements based on attempt history
const ACHIEVEMENT_RULES = [
  {
    id: "first_sim",
    icon: Zap,
    color: "from-blue-400 to-blue-600",
    title: "First Step",
    description: "Completed your very first simulation",
    check: (attempts) => attempts.length >= 1,
  },
  {
    id: "first_pass",
    icon: Star,
    color: "from-amber-400 to-orange-500",
    title: "Rising Star",
    description: "Passed a simulation for the first time",
    check: (attempts) => attempts.some((a) => a.final_score?.passed),
  },
  {
    id: "perfect_score",
    icon: Trophy,
    color: "from-yellow-400 to-amber-500",
    title: "Perfectionist",
    description: "Scored 100% on a simulation",
    check: (attempts) =>
      attempts.some((a) => Math.round(a.final_score?.overall_score ?? 0) === 100),
  },
  {
    id: "no_hints",
    icon: Shield,
    color: "from-green-400 to-emerald-600",
    title: "Self-Reliant",
    description: "Completed a simulation without using any hints",
    check: (attempts) =>
      attempts.some(
        (a) => a.status === "completed" && (a.hints_used ?? 0) === 0
      ),
  },
  {
    id: "high_scorer",
    icon: Target,
    color: "from-purple-400 to-purple-600",
    title: "High Achiever",
    description: "Scored 90% or above on any simulation",
    check: (attempts) =>
      attempts.some((a) => (a.final_score?.overall_score ?? 0) >= 90),
  },
  {
    id: "five_sims",
    icon: Clock,
    color: "from-rose-400 to-pink-600",
    title: "Dedicated Learner",
    description: "Completed 5 or more simulations",
    check: (attempts) =>
      attempts.filter((a) => a.status === "completed").length >= 5,
  },
];

function AchievementCard({ rule, earned }) {
  const Icon = rule.icon;
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4 transition-all"
      style={earned
        ? {
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.06)',
            borderLeft: '3px solid',
            borderLeftColor: 'var(--achievement-accent, rgba(0,0,0,0.1))',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }
        : {
            background: '#161616',
            border: '1px solid rgba(255,255,255,0.05)',
            opacity: 0.55,
          }
      }
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          earned ? `bg-gradient-to-br ${rule.color}` : ""
        }`}
        style={!earned ? { background: 'rgba(0,0,0,0.05)' } : {}}
      >
        <Icon size={22} className="text-white" style={!earned ? { opacity: 0.4 } : {}} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold" style={{ color: earned ? '#ffffff' : '#9ca3af' }}>{rule.title}</p>
        <p className="text-xs mt-0.5" style={{ color: earned ? '#4b5563' : '#9ca3af' }}>{rule.description}</p>
      </div>
      {earned ? (
        <span className="text-xs font-semibold px-2 py-1 rounded-full shrink-0" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
          Earned
        </span>
      ) : (
        <span className="text-xs font-semibold px-2 py-1 rounded-full shrink-0" style={{ background: 'rgba(0,0,0,0.05)', color: '#6b7280' }}>
          Locked
        </span>
      )}
    </div>
  );
}

export function AchievementsPage({ onNavigate }) {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attemptsApi
      .listForLearner(user?.id)
      .then(setAttempts)
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) {
    return <div className="p-5 text-sm" style={{ color: '#4b5563' }}>Loading achievements…</div>;
  }

  const earned = ACHIEVEMENT_RULES.filter((r) => r.check(attempts));
  const locked = ACHIEVEMENT_RULES.filter((r) => !r.check(attempts));

  return (
    <div className="p-5 space-y-4" style={{ background: '#f5f7f8', minHeight: '100%' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Achievements</h1>
          <p className="text-sm" style={{ color: '#4b5563' }}>Your milestones and badges</p>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
          {earned.length} / {ACHIEVEMENT_RULES.length} earned
        </span>
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl p-4" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between text-xs mb-2" style={{ color: '#4b5563' }}>
          <span>Overall Progress</span>
          <span className="font-bold" style={{ color: '#111827' }}>
            {earned.length}/{ACHIEVEMENT_RULES.length}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${(earned.length / ACHIEVEMENT_RULES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Earned */}
      {earned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide px-1" style={{ color: '#6b7280' }}>Earned</p>
          {earned.map((r) => (
            <AchievementCard key={r.id} rule={r} earned={true} />
          ))}
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide px-1" style={{ color: '#6b7280' }}>Locked</p>
          {locked.map((r) => (
            <AchievementCard key={r.id} rule={r} earned={false} />
          ))}
        </div>
      )}

      {attempts.length === 0 && (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <Trophy size={40} className="mx-auto mb-3" style={{ color: '#6b7280' }} />
          <p className="text-sm font-semibold" style={{ color: '#4b5563' }}>No achievements yet</p>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Complete simulations to unlock badges.</p>
          <button
            onClick={() => onNavigate("simulation")}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl transition-colors"
            style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: '#111827' }}
          >
            Start a Simulation
          </button>
        </div>
      )}
    </div>
  );
}
