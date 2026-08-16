import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  CartesianGrid, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, Line
} from "recharts";
import {
  Users, Brain, Award, AlertTriangle,
  CheckCircle, RefreshCw,
  ShieldCheck, GraduationCap, UserCheck, BookOpen, BarChart2
} from "lucide-react";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { usersApi } from "../../api/usersApi";
import { attemptsApi } from "../../api/attemptsApi";
import { simulationsApi } from "../../api/simulationsApi";

// ── Palette ─────────────────────────────────────────────────────────────────
const COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4"];
const ROLE_COLORS = { learner: "#3b82f6", trainer: "#22c55e", admin: "#a855f7" };

// ── Helpers ──────────────────────────────────────────────────────────────────
function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
function avg(arr) { return arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0; }
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Micro-components ─────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{
      background: "#ffffff", borderRadius: 16, padding: "18px 20px",
      border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginTop: 4 }}>{label}</p>
        {sub && <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function Card({ children, style: extraStyle = {} }) {
  return (
    <div style={{
      background: "#ffffff", borderRadius: 16, padding: 20,
      border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      ...extraStyle
    }}>
      {children}
    </div>
  );
}

function ScoreRing({ value, size = 80, color = "#3b82f6" }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fontSize: size * 0.22, fontWeight: 800, fill: "#111827", fontFamily: "Inter,sans-serif" }}>
        {value}%
      </text>
    </svg>
  );
}

const ttStyle = { fontSize: 11, borderRadius: 10, background: "#f9fafb", border: "1px solid rgba(0,0,0,0.08)", color: "#111827" };

const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 8, color: "#6b7280" }}>
    <RefreshCw size={16} className="animate-spin" /> Loading…
  </div>
);

// ── TRAINER COHORT VIEW ───────────────────────────────────────────────────────
function TrainerCohortView() {
  const { user } = useAuth();
  const [learners, setLearners] = useState([]);
  const [allAttempts, setAllAttempts] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      usersApi.list("learner", user?.id),
      simulationsApi.list(),
    ]).then(async ([lrnrs, sims]) => {
      setLearners(lrnrs);
      setSimulations(sims);
      const results = await Promise.all(
        lrnrs.map(l => attemptsApi.listForLearner(l.id).catch(() => []))
      );
      setAllAttempts(results.flat());
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const simMap = useMemo(() => {
    const m = {};
    simulations.forEach(s => { m[s.simulation_id] = s; });
    return m;
  }, [simulations]);

  const completedAttempts = useMemo(() =>
    allAttempts.filter(a => a.status === "completed" || a.final_score != null),
    [allAttempts]
  );

  const scores = completedAttempts.map(a => a.final_score?.overall_score ?? 0).filter(s => s > 0);
  const avgScore = avg(scores);
  const passCount = completedAttempts.filter(a => a.final_score?.passed).length;
  const passRate = pct(passCount, completedAttempts.length);

  const learnerStats = useMemo(() => {
    return learners.map(l => {
      const la = completedAttempts.filter(a => a.learner_id === l.id || a.user_id === l.id);
      const sc = la.map(a => a.final_score?.overall_score ?? 0).filter(s => s > 0);
      const ps = la.filter(a => a.final_score?.passed).length;
      const avgSc = avg(sc);
      return {
        ...l,
        attemptCount: la.length,
        avgScore: avgSc,
        passCount: ps,
        passRate: pct(ps, la.length),
        lastAttemptDate: la.sort((a, b) => new Date(b.ended_at) - new Date(a.ended_at))[0]?.ended_at,
        riskLevel: avgSc < 50 ? "high" : avgSc < 70 ? "medium" : "low",
      };
    });
  }, [learners, completedAttempts]);

  const simPopularity = useMemo(() => {
    const counts = {};
    allAttempts.forEach(a => {
      const title = simMap[a.simulation_id]?.title || a.simulation_id || "Unknown";
      counts[title] = (counts[title] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, count]) => ({ name: name.length > 24 ? name.slice(0, 22) + "…" : name, count }));
  }, [allAttempts, simMap]);

  const categoryPerf = useMemo(() => {
    const catScores = {};
    completedAttempts.forEach(a => {
      const cat = simMap[a.simulation_id]?.category || "General";
      if (!catScores[cat]) catScores[cat] = [];
      if (a.final_score?.overall_score) catScores[cat].push(a.final_score.overall_score);
    });
    return Object.entries(catScores).map(([name, arr]) => ({
      name: name.length > 18 ? name.slice(0, 16) + "…" : name,
      avg: avg(arr), count: arr.length,
    }));
  }, [completedAttempts, simMap]);

  const weeklyTrend = useMemo(() => {
    const weeks = {};
    completedAttempts.forEach(a => {
      const d = new Date(a.ended_at || a.started_at);
      if (isNaN(d)) return;
      const wk = `W${Math.ceil(d.getDate() / 7)}/${d.getMonth() + 1}`;
      if (!weeks[wk]) weeks[wk] = { scores: [], count: 0 };
      weeks[wk].scores.push(a.final_score?.overall_score ?? 0);
      weeks[wk].count++;
    });
    return Object.entries(weeks).slice(-6).map(([week, v]) => ({
      week, avgScore: avg(v.scores), attempts: v.count,
    }));
  }, [completedAttempts]);

  if (loading) return <Spinner />;

  const riskLearners = learnerStats.filter(l => l.riskLevel === "high");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        <KpiCard icon={Users} label="Total Learners" value={learners.length} sub="In your cohort" color="#3b82f6" />
        <KpiCard icon={BookOpen} label="Total Attempts" value={completedAttempts.length} sub="Completed runs" color="#22c55e" />
        <KpiCard icon={Brain} label="Avg Score" value={`${avgScore}%`} sub="Across all simulations" color="#8b5cf6" />
        <KpiCard icon={Award} label="Pass Rate" value={`${passRate}%`} sub={`${passCount} of ${completedAttempts.length}`} color="#f59e0b" />
        <KpiCard icon={AlertTriangle} label="At-Risk Learners" value={riskLearners.length} sub="Score below 50%" color="#ef4444" />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <SectionTitle sub="Average score per week">Weekly Performance Trend</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyTrend.length ? weeklyTrend : [{ week: "W1", avgScore: 0, attempts: 0 }]}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} />
              <Tooltip contentStyle={ttStyle} />
              <Area type="monotone" dataKey="avgScore" name="Avg Score" stroke="#3b82f6" fill="url(#scoreGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle sub="Average score by simulation category">Category Performance</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryPerf.length ? categoryPerf : [{ name: "No data", avg: 0 }]} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="avg" name="Avg Score" radius={[6, 6, 0, 0]}>
                {categoryPerf.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <SectionTitle sub="Most attempted simulations by learners">Simulation Engagement</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={simPopularity.length ? simPopularity : [{ name: "No data", count: 0 }]} barSize={22} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} width={120} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="count" name="Attempts" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle sub="Learners scoring below 50% — needs attention">⚠️ At-Risk Learners</SectionTitle>
          {riskLearners.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 160, color: "#22c55e", gap: 8 }}>
              <CheckCircle size={28} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>All learners performing well!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
              {riskLearners.map(l => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.15)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#ef4444,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                    {l.name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{l.name}</p>
                    <p style={{ fontSize: 10, color: "#9ca3af" }}>{l.attemptCount} attempt{l.attemptCount !== 1 ? "s" : ""} · Avg {l.avgScore}%</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.12)", padding: "2px 8px", borderRadius: 20 }}>
                    {l.avgScore}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Learner roster table */}
      <Card>
        <SectionTitle sub="All learners with simulation performance summary">Learner Performance Roster</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Learner", "Dept", "Attempts", "Avg Score", "Pass Rate", "Last Active", "Risk"].map(h => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {learnerStats.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No learner data yet.</td></tr>
              ) : learnerStats.map(l => {
                const riskColor = l.riskLevel === "high" ? "#ef4444" : l.riskLevel === "medium" ? "#f59e0b" : "#22c55e";
                const scoreBg = l.avgScore >= 80 ? "rgba(34,197,94,0.1)" : l.avgScore >= 60 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";
                const scoreColor = l.avgScore >= 80 ? "#22c55e" : l.avgScore >= 60 ? "#f59e0b" : "#ef4444";
                return (
                  <tr key={l.id} style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                          {l.name?.charAt(0).toUpperCase()}
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{l.name}</p>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280" }}>{l.department || "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#111827" }}>{l.attemptCount}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: scoreBg, color: scoreColor }}>
                        {l.attemptCount ? `${l.avgScore}%` : "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#111827" }}>{l.attemptCount ? `${l.passRate}%` : "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "#9ca3af" }}>{fmtDate(l.lastAttemptDate)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: riskColor }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: riskColor, textTransform: "capitalize" }}>{l.riskLevel}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── ADMIN PLATFORM HEALTH VIEW ────────────────────────────────────────────────
function AdminHealthView() {
  const [users, setUsers] = useState([]);
  const [allAttempts, setAllAttempts] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      usersApi.list(),
      simulationsApi.list(),
    ]).then(async ([us, sims]) => {
      setUsers(us);
      setSimulations(sims);
      const learners = us.filter(u => u.role === "learner");
      const results = await Promise.all(
        learners.map(l => attemptsApi.listForLearner(l.id).catch(() => []))
      );
      setAllAttempts(results.flat());
    }).finally(() => setLoading(false));
  }, []);

  const roleCounts = useMemo(() => {
    const c = { learner: 0, trainer: 0, admin: 0 };
    users.forEach(u => { if (c[u.role] !== undefined) c[u.role]++; });
    return c;
  }, [users]);

  const completedAttempts = useMemo(() =>
    allAttempts.filter(a => a.status === "completed" || a.final_score != null),
    [allAttempts]
  );

  const scores = completedAttempts.map(a => a.final_score?.overall_score ?? 0).filter(s => s > 0);
  const avgScore = avg(scores);
  const passRate = pct(completedAttempts.filter(a => a.final_score?.passed).length, completedAttempts.length);

  const activeLearnerIds = new Set(allAttempts.map(a => a.learner_id || a.user_id));
  const activeRate = pct(activeLearnerIds.size, roleCounts.learner);

  const rolePie = [
    { name: "Learners", value: roleCounts.learner, color: ROLE_COLORS.learner },
    { name: "Trainers", value: roleCounts.trainer, color: ROLE_COLORS.trainer },
    { name: "Admins", value: roleCounts.admin, color: ROLE_COLORS.admin },
  ];

  const deptCounts = useMemo(() => {
    const m = {};
    users.filter(u => u.role === "learner").forEach(u => {
      const d = u.department || "Unassigned";
      m[d] = (m[d] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [users]);

  const scoreDist = useMemo(() => {
    const buckets = { "0-49": 0, "50-69": 0, "70-84": 0, "85-100": 0 };
    completedAttempts.forEach(a => {
      const s = a.final_score?.overall_score ?? 0;
      if (s < 50) buckets["0-49"]++;
      else if (s < 70) buckets["50-69"]++;
      else if (s < 85) buckets["70-84"]++;
      else buckets["85-100"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [completedAttempts]);

  const simHealth = useMemo(() => {
    const m = {};
    completedAttempts.forEach(a => {
      const id = a.simulation_id;
      if (!id) return;
      if (!m[id]) m[id] = { pass: 0, total: 0 };
      m[id].total++;
      if (a.final_score?.passed) m[id].pass++;
    });
    return Object.entries(m).map(([id, v]) => {
      const sim = simulations.find(s => s.simulation_id === id);
      return { name: (sim?.title || id).slice(0, 28), passRate: pct(v.pass, v.total), total: v.total };
    }).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [completedAttempts, simulations]);

  const deptActivity = useMemo(() => {
    const learnerDept = {};
    users.filter(u => u.role === "learner").forEach(u => { learnerDept[u.id] = u.department || "Unassigned"; });
    const m = {};
    allAttempts.forEach(a => {
      const d = learnerDept[a.learner_id || a.user_id] || "Unassigned";
      m[d] = (m[d] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, attempts]) => ({ name, attempts }));
  }, [allAttempts, users]);

  if (loading) return <Spinner />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        <KpiCard icon={Users} label="Total Users" value={users.length} sub="All accounts" color="#3b82f6" />
        <KpiCard icon={GraduationCap} label="Learners" value={roleCounts.learner} sub={`${activeRate}% active`} color="#22c55e" />
        <KpiCard icon={UserCheck} label="Trainers" value={roleCounts.trainer} sub="Available instructors" color="#8b5cf6" />
        <KpiCard icon={Brain} label="Avg Platform Score" value={`${avgScore}%`} sub="All learner attempts" color="#f59e0b" />
        <KpiCard icon={BookOpen} label="Total Simulations" value={simulations.length} sub={`${completedAttempts.length} completed`} color="#06b6d4" />
      </div>

      {/* Health rings + pie */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <Card style={{ textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 12 }}>Overall Pass Rate</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ScoreRing value={passRate} size={90} color={passRate >= 70 ? "#22c55e" : passRate >= 50 ? "#f59e0b" : "#ef4444"} />
          </div>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 10 }}>{completedAttempts.filter(a => a.final_score?.passed).length} of {completedAttempts.length} attempts passed</p>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 12 }}>Learner Activation</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ScoreRing value={activeRate} size={90} color="#3b82f6" />
          </div>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 10 }}>{activeLearnerIds.size} of {roleCounts.learner} learners active</p>
        </Card>
        <Card>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 12 }}>User Role Distribution</p>
          <ResponsiveContainer width="100%" height={110}>
            <PieChart>
              <Pie data={rolePie} dataKey="value" innerRadius={30} outerRadius={50} paddingAngle={3}>
                {rolePie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={ttStyle} formatter={v => [v, "Users"]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
            {rolePie.map(e => (
              <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color }} />
                <span style={{ fontSize: 10, color: "#6b7280" }}>{e.name} ({e.value})</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <SectionTitle sub="Number of attempts per department">Department Activity</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptActivity.length ? deptActivity : [{ name: "No data", attempts: 0 }]} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="attempts" name="Attempts" radius={[6, 6, 0, 0]}>
                {deptActivity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle sub="Distribution of learner scores across score buckets">Score Distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreDist} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="count" name="Learners" radius={[6, 6, 0, 0]}>
                {scoreDist.map((e, i) => {
                  const fill = e.range === "0-49" ? "#ef4444" : e.range === "50-69" ? "#f59e0b" : e.range === "70-84" ? "#3b82f6" : "#22c55e";
                  return <Cell key={i} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Simulation health */}
      <Card>
        <SectionTitle sub="Pass rate and attempt count per simulation">Simulation Health Overview</SectionTitle>
        {simHealth.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "24px 0" }}>No completed simulation data yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {simHealth.map((sim, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sim.name}</p>
                  <p style={{ fontSize: 10, color: "#9ca3af" }}>{sim.total} attempt{sim.total !== 1 ? "s" : ""}</p>
                </div>
                <div style={{ flex: 2, height: 8, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${sim.passRate}%`, borderRadius: 99, background: sim.passRate >= 70 ? "#22c55e" : sim.passRate >= 50 ? "#f59e0b" : "#ef4444", transition: "width 0.6s ease" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: sim.passRate >= 70 ? "#22c55e" : sim.passRate >= 50 ? "#f59e0b" : "#ef4444", width: 42, textAlign: "right", flexShrink: 0 }}>
                  {sim.passRate}%
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Department breakdown */}
      <Card>
        <SectionTitle sub="Learner headcount by department">Department Breakdown</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {deptCounts.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af", gridColumn: "1/-1" }}>No department data available.</p>
          ) : deptCounts.map((d, i) => (
            <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: `${COLORS[i % COLORS.length]}10`, border: `1px solid ${COLORS[i % COLORS.length]}25`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{d.name}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: COLORS[i % COLORS.length] }}>{d.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Root Component ────────────────────────────────────────────────────────────
export function AnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif", background: "#f5f7f8", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: isAdmin ? "rgba(168,85,247,0.15)" : "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isAdmin ? <ShieldCheck size={18} color="#a855f7" /> : <BarChart2 size={18} color="#3b82f6" />}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>
              {isAdmin ? "Platform Health Dashboard" : "Cohort Analytics"}
            </h1>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
              {isAdmin
                ? "Bird's-eye view of all users, system activity, and simulation health across the entire platform."
                : "Real-time performance insights for all learners in your cohort."}
            </p>
          </div>
        </div>
      </div>

      {isAdmin ? <AdminHealthView /> : <TrainerCohortView />}
    </div>
  );
}
