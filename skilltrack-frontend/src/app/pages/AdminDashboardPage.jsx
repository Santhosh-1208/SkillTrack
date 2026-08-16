import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  ShieldCheck, Users, GraduationCap, UserCog, Search, Trash2,
  Filter, RefreshCw, Mail, Calendar, ChevronDown, X, Check, FileText
} from "lucide-react";
import { usersApi } from "../../api/usersApi";
import { scenariosApi } from "../../api/scenariosApi";
import { notificationsApi } from "../../api/notificationsApi";
import { Badge, StatCard } from "../components/shared/atoms";

const ROLE_COLORS = { learner: "#3B6EF5", trainer: "#22C55E", admin: "#A855F7" };
const ROLE_BG = { learner: "rgba(59,110,245,0.15)", trainer: "rgba(34,197,94,0.15)", admin: "rgba(168,85,247,0.15)" };
const ROLE_TEXT = { learner: "#60a5fa", trainer: "#4ade80", admin: "#c084fc" };

function Avatar({ name, role }) {
  const initials = name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${ROLE_COLORS[role] || "#94a3b8"}cc, ${ROLE_COLORS[role] || "#94a3b8"})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#1f2937", fontWeight: 700, fontSize: 13
    }}>
      {initials}
    </div>
  );
}

function ConfirmDeleteModal({ user, onConfirm, onCancel }) {
  if (!user) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: "#ffffff", borderRadius: 20, padding: 32, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ width: 48, height: 48, background: "rgba(239,68,68,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Trash2 size={22} color="#ef4444" />
        </div>
        <h3 style={{ textAlign: "center", fontWeight: 800, fontSize: 18, marginBottom: 8, color: '#111827' }}>Remove User?</h3>
        <p style={{ textAlign: "center", color: "#4b5563", fontSize: 14, marginBottom: 24 }}>
          <strong style={{ color: '#111827' }}>{user.name}</strong> ({user.role}) will be permanently removed. This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", background: "#f3f4f6", color: '#111827', fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: '#ffffff', fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Remove</button>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [scenarios, setScenarios] = useState([]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadData() {
    setLoading(true);
    try {
      const [userRows, scenarioRes] = await Promise.all([
        usersApi.list(),
        scenariosApi.list()
      ]);
      setUsers(userRows);
      setScenarios(scenarioRes.rows || []);
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const counts = useMemo(() =>
    users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, { learner: 0, trainer: 0, admin: 0 }),
    [users]
  );

  const chartData = useMemo(() => [
    { name: "Learners", key: "learner", value: counts.learner },
    { name: "Trainers", key: "trainer", value: counts.trainer },
    { name: "Admins", key: "admin", value: counts.admin },
  ], [counts]);

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, search, roleFilter]);

  const pendingApprovals = useMemo(() => 
    scenarios.filter(s => s.status === "Pending Approval"),
  [scenarios]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await usersApi.remove(deleteTarget.id);
      showToast(`${deleteTarget.name} has been removed.`);
      setDeleteTarget(null);
      await loadData();
    } catch {
      showToast("Failed to remove user. Check if the backend is running.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleApprove = async (sim, approve) => {
    const newStatus = approve ? "Active" : "Draft";
    try {
      await scenariosApi.update(sim.simulation_id, { status: newStatus });
      showToast(`Simulation ${approve ? "Approved" : "Rejected"}.`);
      
      // Notify all trainers (as we don't track the exact author currently, notify trainers)
      const trainers = users.filter(u => u.role === "trainer");
      await Promise.all(trainers.map(t => 
        notificationsApi.pushNotification({
          userId: t.id,
          role: "trainer",
          category: "system",
          title: `Simulation ${approve ? "Approved" : "Rejected"}`,
          description: `The simulation "${sim.title}" has been ${approve ? "approved and is now live" : "rejected and set back to Draft"}.`,
          icon: approve ? "Check" : "X",
          color: approve ? "#22c55e" : "#ef4444"
        })
      ));
      
      await loadData();
    } catch {
      showToast(`Failed to update simulation.`, "error");
    }
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Inter, sans-serif", minHeight: "100vh", background: "#f5f7f8" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 24, zIndex: 9999, padding: "12px 18px", borderRadius: 12, background: toast.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: toast.type === "error" ? "#ef4444" : "#22c55e", fontWeight: 600, fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, display: "flex", alignItems: "center", gap: 8 }}>
          {toast.type === "error" ? "❌" : "✅"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>User Management</h1>
          <p style={{ fontSize: 13, color: "#4b5563" }}>Manage all learners, trainers, and administrators from one place.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={loadData} style={{ padding: "9px 12px", background: "#f3f4f6", color: "#4b5563", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer", display: "flex", alignItems: "center" }} title="Refresh">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Approvals Section */}
      {pendingApprovals.length > 0 && (
        <div style={{ background: "#ffffff", borderRadius: 20, boxShadow: "0 2px 12px rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(245,158,11,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: "rgba(245,158,11,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={16} color="#f59e0b" />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Pending Simulation Approvals</h2>
            </div>
            <Badge color="orange">{pendingApprovals.length} pending</Badge>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: "uppercase" }}>Simulation Title</th>
                <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: "uppercase" }}>Branch</th>
                <th style={{ padding: "10px 20px", textAlign: "right", fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.map(sim => (
                <tr key={sim.simulation_id} style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                  <td style={{ padding: "12px 20px" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{sim.title}</p>
                    <p style={{ fontSize: 11, color: '#6b7280' }}>{sim.simulation_id}</p>
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: 12, color: "#4b5563" }}>{sim.branch}</td>
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                      <button onClick={() => handleApprove(sim, false)} style={{ padding: "6px 12px", background: "#fef2f2", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                      <button onClick={() => handleApprove(sim, true)} style={{ padding: "6px 16px", background: "#10b981", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Approve</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Users" value={users.length} sub="All accounts" icon={Users} color="#3B6EF5" />
        <StatCard label="Learners" value={counts.learner} sub="Registered learners" icon={GraduationCap} color="#22C55E" />
        <StatCard label="Trainers" value={counts.trainer} sub="Available instructors" icon={UserCog} color="#F59E0B" />
        <StatCard label="Admins" value={counts.admin} sub="Platform managers" icon={ShieldCheck} color="#A855F7" />
      </div>

      {/* Main Content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 20 }}>

        {/* User Table */}
        <div style={{ background: "#ffffff", borderRadius: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {/* Toolbar */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.05)", borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(0,0,0,0.1)" }}>
              <Search size={14} color="#9ca3af" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: '#111827', fontFamily: "Inter, sans-serif" }}
              />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={13} color="#9ca3af" /></button>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "learner", "trainer", "admin"].map(r => (
                <button key={r} onClick={() => setRoleFilter(r)} style={{
                  padding: "6px 12px", borderRadius: 8, border: "1px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  background: roleFilter === r ? ROLE_COLORS[r] || "#ffffff" : "#f3f4f6",
                  color: roleFilter === r ? "#fff" : "#4b5563",
                  borderColor: roleFilter === r ? ROLE_COLORS[r] || "#ffffff" : "rgba(0,0,0,0.1)",
                }}>
                  {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            {loading ? (
              <div style={{ padding: "48px", textAlign: "center", color: '#6b7280', fontSize: 13 }}>Loading users…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", color: '#6b7280', fontSize: 13 }}>No users match your search.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["User", "Email", "Role", "Joined", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={u.id} style={{ borderTop: "1px solid rgba(0,0,0,0.05)", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={u.name} role={u.role} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{u.name}</p>
                            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{u.department || u.batch || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Mail size={11} color="#9ca3af" />
                          <span style={{ fontSize: 12, color: "#4b5563" }}>{u.email}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: ROLE_BG[u.role] || "rgba(0,0,0,0.05)", color: ROLE_TEXT[u.role] || "#4b5563" }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Calendar size={11} color="#9ca3af" />
                          <span style={{ fontSize: 12, color: "#4b5563" }}>{u.joinedAt || "—"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          <Trash2 size={11} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 11, color: '#6b7280' }}>
            Showing {filtered.length} of {users.length} users
          </div>
        </div>

        {/* Right: Role Chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#ffffff", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#111827' }}>Role Distribution</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={68} paddingAngle={4}>
                  {chartData.map(e => <Cell key={e.key} fill={ROLE_COLORS[e.key]} />)}
                </Pie>
                <Tooltip
                  formatter={v => [v, "Users"]}
                  contentStyle={{ background: "#f3f4f6", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, color: '#111827' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {chartData.map(e => (
                <div key={e.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: ROLE_COLORS[e.key] }} />
                    <span style={{ fontSize: 12, color: "#4b5563" }}>{e.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal user={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
