import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Zap, BarChart2, Award, Download, FileImage } from "lucide-react";
import { attemptsApi } from "../../api/attemptsApi";
import { simulationsApi } from "../../api/simulationsApi";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { Badge, BackendErrorNotice, StatCard } from "../components/shared/atoms";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(seconds) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

export function ReportsPage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      attemptsApi.listForLearner(user.id).catch((e) => { setError(e.message); return []; }),
      simulationsApi.list().catch(() => []),
    ])
      .then(([atts, sims]) => {
        setAttempts(atts);
        setSimulations(sims);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const completed = useMemo(
    () => attempts.filter((a) => a.status === "completed" || a.final_score),
    [attempts],
  );

  const simMap = useMemo(
    () => Object.fromEntries(simulations.map((s) => [s.simulation_id, s.title])),
    [simulations],
  );

  const overallScore = useMemo(() => {
    const scores = completed.map((a) => a.final_score?.overall_score).filter((s) => s != null);
    if (!scores.length) return null;
    return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  }, [completed]);

  const skillData = useMemo(() => {
    const buckets = {};
    completed.forEach((a) => {
      const comps = a.final_score?.competency_scores || {};
      Object.entries(comps).forEach(([name, val]) => {
        if (!buckets[name]) buckets[name] = [];
        buckets[name].push(val);
      });
    });
    return Object.entries(buckets).map(([name, vals]) => ({
      name: name.length > 12 ? name.slice(0, 10) + "…" : name,
      score: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }));
  }, [completed]);

  const activityData = useMemo(() => {
    return [...completed]
      .sort((a, b) => new Date(a.ended_at || a.started_at) - new Date(b.ended_at || b.started_at))
      .slice(-5)
      .map((a) => ({
        date: formatDate(a.ended_at || a.started_at).replace(/ \d{4}$/, ""),
        score: Math.round(a.final_score?.overall_score ?? 0),
      }));
  }, [completed]);

  const tableRows = useMemo(() => {
    return [...completed]
      .sort((a, b) => new Date(b.ended_at || b.started_at) - new Date(a.ended_at || a.started_at))
      .map((a) => ({
        id: a.attempt_id,
        name: simMap[a.simulation_id] || a.simulation_id,
        date: formatDate(a.ended_at || a.started_at),
        dur: formatDuration(a.total_time_seconds),
        score: Math.round(a.final_score?.overall_score ?? 0),
        status: a.final_score?.passed ? "Passed" : "Review",
      }));
  }, [completed, simMap]);

  // ── PDF Export: builds report HTML purely from state data with inline styles ──
  // No DOM cloning, no Tailwind dependencies — works in any new window.
  function handleExportPDF() {
    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) {
      alert("Pop-up was blocked. Please allow pop-ups for this site and try again.");
      return;
    }

    const passedCount = completed.filter((a) => a.final_score?.passed).length;
    const generatedAt = new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });

    // Skill bars
    const skillBarsHTML = skillData.length
      ? skillData.map(({ name, score }) => {
          const color = score >= 85 ? "#22c55e" : score >= 70 ? "#3b82f6" : score >= 50 ? "#f59e0b" : "#ef4444";
          return `
            <div style="margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:12px;color:#475569;">${name}</span>
                <span style="font-size:12px;font-weight:700;color:${color};">${score}%</span>
              </div>
              <div style="height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
                <div style="height:100%;width:${score}%;background:${color};border-radius:999px;"></div>
              </div>
            </div>`;
        }).join("")
      : `<p style="font-size:12px;color:#94a3b8;text-align:center;padding:20px 0;">No skill data yet.</p>`;

    // Activity bars
    const activityHTML = activityData.length
      ? activityData.map(({ date, score }) => {
          const color = score >= 80 ? "#22c55e" : score >= 60 ? "#3b82f6" : "#f59e0b";
          return `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <span style="font-size:11px;color:#64748b;min-width:60px;">${date}</span>
              <div style="flex:1;height:6px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
                <div style="height:100%;width:${score}%;background:${color};border-radius:999px;"></div>
              </div>
              <span style="font-size:11px;font-weight:700;color:${color};min-width:34px;text-align:right;">${score}%</span>
            </div>`;
        }).join("")
      : `<p style="font-size:12px;color:#94a3b8;text-align:center;padding:20px 0;">No activity data yet.</p>`;

    // Table rows
    const tableRowsHTML = tableRows.length
      ? tableRows.map((r, i) => {
          const scoreColor = r.score >= 90 ? "#22c55e" : r.score >= 70 ? "#3b82f6" : "#f59e0b";
          const badgeBg = r.status === "Passed" ? "#dcfce7" : "#fff7ed";
          const badgeColor = r.status === "Passed" ? "#16a34a" : "#ea580c";
          return `
            <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
              <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${r.name}</td>
              <td style="padding:10px 14px;font-size:12px;color:#64748b;border-bottom:1px solid #f1f5f9;">${r.date}</td>
              <td style="padding:10px 14px;font-size:12px;color:#64748b;border-bottom:1px solid #f1f5f9;">${r.dur}</td>
              <td style="padding:10px 14px;font-size:12px;font-weight:700;color:${scoreColor};border-bottom:1px solid #f1f5f9;">${r.score}%</td>
              <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:11px;font-weight:600;background:${badgeBg};color:${badgeColor};padding:3px 10px;border-radius:999px;">${r.status}</span>
              </td>
            </tr>`;
        }).join("")
      : `<tr><td colspan="5" style="padding:24px;text-align:center;font-size:12px;color:#94a3b8;">No completed simulations yet.</td></tr>`;

    const statCards = [
      { label: "Overall Score", value: overallScore != null ? `${overallScore}%` : "—", color: "#3b82f6" },
      { label: "Completed", value: String(completed.length), color: "#22c55e" },
      { label: "Avg Score", value: overallScore != null ? `${overallScore}` : "—", color: "#f59e0b" },
      { label: "Passed", value: String(passedCount), color: "#a855f7" },
    ].map(({ label, value, color }) => `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
        <p style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">${label}</p>
        <p style="font-size:26px;font-weight:800;color:${color};line-height:1;">${value}</p>
      </div>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>SkillTrack — Performance Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #1e293b;
      padding: 32px;
      font-size: 13px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page { margin: 1.2cm; size: A4 portrait; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #3b82f6;">
    <div>
      <div style="font-size:10px;font-weight:700;color:#3b82f6;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">SkillTrack Safety Training</div>
      <div style="font-size:24px;font-weight:800;color:#0f172a;">Performance Report</div>
      <p style="font-size:11px;color:#64748b;margin-top:5px;">Generated on ${generatedAt}</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:14px;font-weight:700;color:#1e293b;">${user?.name || "Learner"}</p>
      <p style="font-size:11px;color:#64748b;margin-top:3px;">${completed.length} completed simulation${completed.length !== 1 ? "s" : ""}</p>
    </div>
  </div>

  <!-- Stat cards -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
    ${statCards}
  </div>

  <!-- Skill areas + Activity -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <h3 style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:14px;">Skill Areas</h3>
      ${skillBarsHTML}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <h3 style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:14px;">Recent Activity</h3>
      ${activityHTML}
    </div>
  </div>

  <!-- Simulations table -->
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
    <div style="padding:12px 16px;border-bottom:1px solid #e2e8f0;background:#fff;">
      <h3 style="font-size:13px;font-weight:700;color:#1e293b;">Recent Simulations</h3>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#64748b;text-align:left;">Simulation</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#64748b;text-align:left;">Date</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#64748b;text-align:left;">Duration</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#64748b;text-align:left;">Score</th>
          <th style="padding:10px 14px;font-size:11px;font-weight:600;color:#64748b;text-align:left;">Status</th>
        </tr>
      </thead>
      <tbody>${tableRowsHTML}</tbody>
    </table>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding-top:12px;border-top:1px solid #e2e8f0;">
    <p style="font-size:10px;color:#94a3b8;">SkillTrack Safety Training Platform · Confidential · ${generatedAt}</p>
  </div>

  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 600); };
  <\/script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  async function handleExportImage() {
    setExporting(true);
    try {
      const html2canvas = (await import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js").catch(() => null))?.default;
      if (!html2canvas || !reportRef.current) {
        handleExportPDF();
        return;
      }
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#f8fafc" });
      const link = document.createElement("a");
      link.download = `skilltrack-report-${user?.name?.replace(/\s+/g, "-") || "user"}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      handleExportPDF();
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <div className="p-5 text-sm" style={{ color: '#4b5563' }}>Loading reports…</div>;
  }

  return (
    <div className="p-5 space-y-4" ref={reportRef} style={{ background: '#f5f7f8', minHeight: '100%' }}>
      {error && <BackendErrorNotice>{error}</BackendErrorNotice>}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Performance Report</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6b7280' }}>{completed.length} completed attempt(s)</span>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.1)', color: '#111827' }}
            title="Export as PDF via print dialog"
          >
            <Download size={11} /> Export PDF
          </button>
          <button
            onClick={handleExportImage}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
            style={{ background: '#0056D2', color: '#ffffff', boxShadow: '0 2px 8px rgba(0,86,210,0.35)' }}
            title="Export as PNG image"
          >
            <FileImage size={11} /> {exporting ? "Exporting…" : "Export Image"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Overall Score"
          value={overallScore != null ? `${overallScore}%` : "—"}
          sub="Average across completed runs"
          icon={TrendingUp}
          color="#3B6EF5"
        />
        <StatCard label="Simulations" value={completed.length} sub="Completed" icon={Zap} color="#22C55E" />
        <StatCard
          label="Avg Score"
          value={overallScore != null ? overallScore : "—"}
          sub="Per simulation"
          icon={BarChart2}
          color="#F59E0B"
        />
        <StatCard
          label="Passed"
          value={completed.filter((a) => a.final_score?.passed).length}
          sub="Earned"
          icon={Award}
          color="#A855F7"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#111827' }}>Skill Areas</h3>
          {skillData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={skillData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "Poppins" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, fontFamily: "Poppins", background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.1)', color: '#111827' }} />
                <Bar dataKey="score" fill="#3B6EF5" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs py-8 text-center" style={{ color: '#6b7280' }}>Complete simulations to see skill charts.</p>
          )}
        </div>
        <div className="rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#111827' }}>Recent Activity</h3>
          {activityData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.1)', color: '#111827' }} />
                <Line type="monotone" dataKey="score" stroke="#22C55E" strokeWidth={2.5} dot={{ fill: "#22C55E", r: 3.5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs py-8 text-center" style={{ color: '#6b7280' }}>No activity data yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h3 className="text-sm font-bold" style={{ color: '#111827' }}>Recent Simulations</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="text-xs" style={{ background: '#f3f4f6', color: '#4b5563' }}>
              {["Simulation", "Date", "Duration", "Score", "Status"].map((h) => (
                <TableHead key={h} className="px-4 py-2.5 text-left font-semibold h-auto">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
            {tableRows.length ? (
              tableRows.map((r, idx) => (
                <TableRow
                  key={r.id}
                  className="transition-colors"
                  style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f9fafb'}
                >
                  <TableCell className="px-4 py-3 text-xs font-semibold" style={{ color: '#111827' }}>{r.name}</TableCell>
                  <TableCell className="px-4 py-3 text-xs" style={{ color: '#4b5563' }}>{r.date}</TableCell>
                  <TableCell className="px-4 py-3 text-xs" style={{ color: '#4b5563' }}>{r.dur}</TableCell>
                  <TableCell
                    className="px-4 py-3 text-xs font-bold"
                    style={{ color: r.score >= 90 ? "#22C55E" : r.score >= 80 ? "#3B6EF5" : "#F59E0B" }}
                  >
                    {r.score}%
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge color={r.status === "Passed" ? "green" : "orange"}>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="px-4 py-8 text-center text-xs" style={{ color: '#6b7280' }}>
                  No completed simulations yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
