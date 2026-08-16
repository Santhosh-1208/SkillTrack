import { useEffect, useState, useMemo } from "react";
import { ArrowUp, Users, Award } from "lucide-react";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { Badge } from "../components/shared/atoms";
import { apiClient } from "../../lib/apiClient";
import { attemptsApi } from "../../api/attemptsApi";
import { usersApi } from "../../api/usersApi";

const BADGE = ["🥇", "🥈", "🥉"];

function resolveScore(attempt) {
  const fs = attempt.final_score;
  if (typeof fs === "number") return fs;
  if (fs && typeof fs === "object" && fs.overall_score != null) return Number(fs.overall_score);
  return attempt.score ?? 0;
}

function computeAvg(attempts) {
  const scores = attempts.map(resolveScore).filter((s) => s > 0);
  if (!scores.length) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function isGhost(name) {
  const n = (name || "").toLowerCase().trim();
  return n === "" || n === "learner" || n === "trainer" || n === "admin";
}

function isAdminUser(id, name, role) {
  if ((role || "").toLowerCase() === "admin") return true;
  if (id === "admin-1") return true;
  const lname = (name || "").toLowerCase();
  return lname.includes("admin") || lname === "system admin";
}

export function LeaderboardPage() {
  const { user } = useAuth();
  const myRole = (user?.role || "learner").toLowerCase();

  // Active view tab: 'learners' | 'trainers'
  const [activeTab, setActiveTab] = useState(myRole === "trainer" ? "trainers" : "learners");

  const [learnersData, setLearnersData] = useState([]);
  const [trainersData, setTrainersData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    Promise.all([
      usersApi.list("learner").catch(() => []),
      usersApi.list("trainer").catch(() => []),
      apiClient.get("/api/analytics/leaderboard").catch(() => null),
      myRole === "learner"
        ? attemptsApi
            .listForLearner(user.id)
            .then((a) => a.filter((x) => x.status === "completed" || x.final_score != null))
            .catch(() => [])
        : Promise.resolve([]),
    ]).then(([rawLearners, rawTrainers, backendBoard, myLocalAttempts]) => {

      // ── 1. Build Learner Data ──────────────────────────────────────────────
      const learnerMap = {};

      // Seed with real learners from directory
      (Array.isArray(rawLearners) ? rawLearners : []).forEach((u) => {
        const uid = u.id || u.user_id;
        const uname = u.name || u.username || "";
        if (!uid || isGhost(uname) || isAdminUser(uid, uname, u.role)) return;
        learnerMap[uid] = { id: uid, name: uname, role: "learner", score: 0, simulations: 0 };
        learnerMap[uname.toLowerCase().trim()] = learnerMap[uid];
      });

      // Enrich from backend analytics board
      if (Array.isArray(backendBoard)) {
        backendBoard.forEach((item) => {
          const id = item.id || item.learner_id;
          const name = item.name || item.learner_name;
          const role = (item.role || "").toLowerCase();
          const score = typeof item.score === "number" ? Math.round(item.score) : 0;
          const sims = item.simulations || item.sims || 0;

          if (!name || isGhost(name) || isAdminUser(id, name, role) || role === "trainer") return;

          const key = id || name.toLowerCase().trim();
          const existing = learnerMap[key] || learnerMap[name.toLowerCase().trim()];

          if (existing) {
            existing.score = score;
            existing.simulations = sims;
          } else {
            const newObj = { id: id || key, name, role: "learner", score, simulations: sims };
            learnerMap[key] = newObj;
          }
        });
      }

      // Merge current user's local attempts if logged in user is a learner
      if (myRole === "learner" && user.id && user.name) {
        const localSims = myLocalAttempts.length;
        const localScore = localSims > 0 ? computeAvg(myLocalAttempts) : 0;
        const key = user.id || user.name.toLowerCase().trim();
        const existing = learnerMap[key] || learnerMap[user.name.toLowerCase().trim()];

        if (existing) {
          if (localSims > 0) {
            existing.score = localScore;
            existing.simulations = localSims;
          }
        } else if (!isAdminUser(user.id, user.name, myRole)) {
          learnerMap[user.id] = {
            id: user.id,
            name: user.name,
            role: "learner",
            score: localScore,
            simulations: localSims,
          };
        }
      }

      // Final learner list (unique items with completed simulations)
      const uniqueLearners = Array.from(new Set(Object.values(learnerMap))).filter(
        (l) => l && !isAdminUser(l.id, l.name, l.role) && !isGhost(l.name)
      );

      // Rank learners by score desc, then sims desc
      uniqueLearners.sort((a, b) => b.score - a.score || b.simulations - a.simulations);
      const rankedLearners = uniqueLearners.map((item, idx) => ({
        ...item,
        rank: idx + 1,
        badge: BADGE[idx] ?? "⭐",
      }));

      setLearnersData(rankedLearners);

      // ── 2. Build Trainer Data (ranked on learners' aggregated performance) ──
      // Calculate overall learner average score and total learner simulations
      const activeLearnerItems = rankedLearners.filter((l) => l.simulations > 0);
      const totalLearnerSims = activeLearnerItems.reduce((acc, l) => acc + l.simulations, 0);
      const avgLearnerScore = activeLearnerItems.length
        ? Math.round(activeLearnerItems.reduce((acc, l) => acc + l.score, 0) / activeLearnerItems.length)
        : 0;

      const trainerList = [];

      (Array.isArray(rawTrainers) ? rawTrainers : []).forEach((t) => {
        const tid = t.id || t.user_id;
        const tname = t.name || t.username || "";
        if (!tid || isGhost(tname) || isAdminUser(tid, tname, t.role)) return;

        trainerList.push({
          id: tid,
          name: tname,
          role: "trainer",
          // Trainer rank is based on their learners' performance!
          score: avgLearnerScore,
          simulations: totalLearnerSims,
          learnerCount: activeLearnerItems.length,
        });
      });

      // Ensure current user is in trainer list if logged in as trainer
      if (myRole === "trainer" && user.id && user.name) {
        if (!trainerList.some((t) => t.id === user.id || t.name === user.name)) {
          trainerList.push({
            id: user.id,
            name: user.name,
            role: "trainer",
            score: avgLearnerScore,
            simulations: totalLearnerSims,
            learnerCount: activeLearnerItems.length,
          });
        }
      }

      trainerList.sort((a, b) => b.score - a.score || b.simulations - a.simulations);
      const rankedTrainers = trainerList.map((item, idx) => ({
        ...item,
        rank: idx + 1,
        badge: BADGE[idx] ?? "⭐",
      }));

      setTrainersData(rankedTrainers);
      setLoading(false);
    });
  }, [user?.id, user?.name, myRole]);

  // Current display list based on active tab
  const displayList = activeTab === "trainers" ? trainersData : learnersData;

  const top3 = useMemo(() => {
    return displayList.filter((x) => x.simulations > 0).slice(0, 3);
  }, [displayList]);

  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumH = { 1: "h-24", 2: "h-16", 3: "h-14" };
  const podiumBg = { 1: "bg-amber-400", 2: "bg-slate-400", 3: "bg-orange-400" };

  const youEntry = useMemo(() => {
    if (myRole === "admin") return null;
    return displayList.find(
      (l) => l.id === user?.id || l.name?.toLowerCase().trim() === user?.name?.toLowerCase().trim()
    );
  }, [displayList, myRole, user?.id, user?.name]);

  if (loading) {
    return <div className="p-5 text-sm" style={{ color: '#4b5563' }}>Loading Leaderboard…</div>;
  }

  return (
    <div className="p-5 space-y-4" style={{ background: '#f5f7f8', minHeight: '100%' }}>
      {/* Header & Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Leaderboard</h1>
          <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
            {activeTab === "trainers"
              ? "Trainers ranked by their learners' overall average performance"
              : "Learners ranked by average simulation scores"}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 rounded-xl gap-1" style={{ background: '#f3f4f6' }}>
          <button
            onClick={() => setActiveTab("learners")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={activeTab === "learners"
              ? { background: '#0056D2', color: '#ffffff', boxShadow: '0 2px 8px rgba(0,86,210,0.4)' }
              : { color: '#4b5563' }}
          >
            <Users size={13} /> Learner Board
          </button>
          <button
            onClick={() => setActiveTab("trainers")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={activeTab === "trainers"
              ? { background: '#0056D2', color: '#ffffff', boxShadow: '0 2px 8px rgba(0,86,210,0.4)' }
              : { color: '#4b5563' }}
          >
            <Award size={13} /> Trainer Board
          </button>
        </div>
      </div>

      {/* Empty State */}
      {displayList.filter((l) => l.simulations > 0).length === 0 && (
        <div className="rounded-xl p-8 text-center text-sm" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', color: '#4b5563' }}>
          {activeTab === "trainers"
            ? "No trainer ranking available yet. Complete learner simulations to generate trainer rankings!"
            : "No completed learner simulations yet."}
        </div>
      )}

      {/* Podium */}
      {podiumOrder.length > 0 && (
        <div className="flex items-end justify-center gap-5 rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', border: '1px solid rgba(0,0,0,0.06)' }}>
          {podiumOrder.map((l) => (
            <div key={l.id} className="flex flex-col items-center gap-2">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: '#f3f4f6',
                  border: l.id === user?.id || l.name === user?.name ? '2px solid #E50914' : '2px solid rgba(0,0,0,0.1)',
                  color: '#111827',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                {l.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-xs font-bold" style={{ color: '#111827' }}>{l.name.split(" ")[0]}</p>
              <p className="text-[11px]" style={{ color: '#4b5563' }}>{l.score}%</p>
              <div
                className={`w-16 ${podiumH[l.rank] ?? "h-12"} ${podiumBg[l.rank] ?? "bg-gray-300"} rounded-t-lg flex items-end justify-center pb-1.5`}
              >
                <span className="text-sm font-bold text-white">{l.rank}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Table */}
      {displayList.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <table className="w-full">
            <thead>
              <tr className="text-xs" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                <th className="px-4 py-2.5 text-left font-semibold">Rank</th>
                <th className="px-4 py-2.5 text-left font-semibold">
                  {activeTab === "trainers" ? "Trainer Name" : "Learner Name"}
                </th>
                <th className="px-4 py-2.5 text-left font-semibold">
                  {activeTab === "trainers" ? "Learner Avg Score" : "Avg Score"}
                </th>
                <th className="px-4 py-2.5 text-left font-semibold">
                  {activeTab === "trainers" ? "Total Learner Sims" : "Sims"}
                </th>
                <th className="px-4 py-2.5 text-left font-semibold">Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
              {displayList.map((l) => {
                const isYou = l.id === user?.id || l.name?.toLowerCase().trim() === user?.name?.toLowerCase().trim();
                const scoreColor =
                  l.score >= 85
                    ? "#22c55e"
                    : l.score >= 70
                    ? "#3b82f6"
                    : l.score >= 50
                    ? "#f59e0b"
                    : "#ef4444";
                return (
                  <tr
                    key={l.id}
                    className="transition-colors"
                    style={{
                      background: isYou
                        ? 'rgba(0,86,210,0.08)'
                        : displayList.indexOf(l) % 2 === 0 ? '#ffffff' : '#f9fafb',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={e => e.currentTarget.style.background = isYou ? 'rgba(0,86,210,0.08)' : displayList.indexOf(l) % 2 === 0 ? '#ffffff' : '#f9fafb'}
                  >
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: '#111827' }}>
                      {l.simulations > 0 ? `#${l.rank}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                          {l.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-semibold" style={{ color: '#111827' }}>{l.name}</span>
                          {activeTab === "trainers" && (
                            <span className="block text-[10px]" style={{ color: '#6b7280' }}>
                              {l.learnerCount} active learner{l.learnerCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        {isYou && <Badge color="blue">You</Badge>}
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-sm font-bold"
                      style={{ color: l.simulations > 0 ? scoreColor : "#94a3b8" }}
                    >
                      {l.simulations > 0 ? `${l.score}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#4b5563' }}>
                      {l.simulations}
                    </td>
                    <td className="px-4 py-3 text-xl">
                      {l.simulations > 0 ? l.badge : <span className="text-sm" style={{ color: '#6b7280' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Your Position Sticky Card */}
      {youEntry && (
        <div className="rounded-2xl p-4 flex items-center justify-between text-white" style={{ background: 'linear-gradient(135deg, #E50914 0%, #b20710 100%)', boxShadow: '0 4px 16px rgba(0,86,210,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-sm font-bold">{user?.name || "You"}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {activeTab === "trainers" ? (
                  <>Rank #{youEntry.rank} · {youEntry.score}% learner avg · {youEntry.simulations} total learner sim{youEntry.simulations !== 1 ? "s" : ""}</>
                ) : youEntry.simulations > 0 ? (
                  <>Rank #{youEntry.rank} · {youEntry.score}% avg · {youEntry.simulations} sim{youEntry.simulations !== 1 ? "s" : ""}</>
                ) : (
                  <>Complete a simulation to get ranked on the leaderboard!</>
                )}
              </p>
            </div>
          </div>
          {youEntry.simulations > 0 && displayList.filter((l) => l.simulations > 0).length > 1 && (
            <span className="text-xs text-green-300 font-semibold flex items-center gap-1">
              <ArrowUp size={12} />
              Top {Math.max(1, Math.round((youEntry.rank / displayList.filter((l) => l.simulations > 0).length) * 100))}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
