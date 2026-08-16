import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Users, UserCheck, Clock3, Search, Trash2, X, RefreshCw, Mail, BookOpen, Send } from "lucide-react";
import { usersApi } from "../../api/usersApi";
import { simulationsApi } from "../../api/simulationsApi";
import { notificationsApi } from "../../api/notificationsApi";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { Badge, StatCard } from "../components/shared/atoms";

function Avatar({ name }) {
  const initials = name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: '#ffffff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function ConfirmDeleteModal({ learner, onConfirm, onCancel }) {
  if (!learner) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: "#ffffff", borderRadius: 20, padding: 32, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ width: 48, height: 48, background: "rgba(239,68,68,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Trash2 size={22} color="#ef4444" />
        </div>
        <h3 style={{ textAlign: "center", fontWeight: 800, fontSize: 18, marginBottom: 8, color: '#111827' }}>Remove Learner?</h3>
        <p style={{ textAlign: "center", color: "#4b5563", fontSize: 14, marginBottom: 24 }}>
          <strong style={{ color: '#111827' }}>{learner.name}</strong> will be permanently removed from the platform.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", background: "#f3f4f6", color: '#111827', fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: '#ffffff', fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>Remove</button>
        </div>
      </div>
    </div>
  );
}

function AssignSimulationModal({ learner, onClose, onAssigned, trainer }) {
  const [simulations, setSimulations] = useState([]);
  const [selectedSim, setSelectedSim] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    simulationsApi.list().then(sims => {
      setSimulations(sims);
      if (sims.length) setSelectedSim(sims[0].simulation_id);
    }).finally(() => setLoading(false));
  }, []);

  const handleAssign = () => {
    if (!selectedSim) return;
    setSubmitting(true);
    const simTitle = simulations.find(s => s.simulation_id === selectedSim)?.title || selectedSim;
    try {
      notificationsApi.createAssignment({
        trainerId: trainer?.id,
        trainerName: trainer?.name,
        learnerIds: [learner.id],
        simulationId: selectedSim,
        simulationTitle: simTitle,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        message
      });
      onAssigned();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!learner) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: "#ffffff", borderRadius: 20, padding: 32, maxWidth: 450, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, background: "rgba(59,130,246,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={20} color="#3b82f6" />
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>Assign Simulation</h3>
            <p style={{ color: "#4b5563", fontSize: 13 }}>To: <strong style={{ color: '#111827' }}>{learner.name}</strong></p>
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: '#6b7280' }}>Loading simulations...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>Select Simulation</label>
              <select 
                value={selectedSim} 
                onChange={e => setSelectedSim(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "#f9fafb", fontSize: 13, color: '#111827', outline: "none", fontFamily: "inherit" }}
              >
                {simulations.map(sim => (
                  <option key={sim.simulation_id} value={sim.simulation_id}>{sim.title} ({sim.level ? `Level ${sim.level}` : sim.category})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>Optional Message</label>
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="E.g., Please complete this before Friday's session."
                rows={3}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "#f9fafb", fontSize: 13, color: '#111827', outline: "none", fontFamily: "inherit", resize: "none" }}
              />
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", background: "#f3f4f6", color: '#111827', fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handleAssign} disabled={submitting || loading || !selectedSim} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: '#ffffff', fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: submitting || !selectedSim ? 0.7 : 1 }}>
            <Send size={15} /> Assign
          </button>
        </div>
      </div>
    </div>
  );
}

export function TrainerDashboardPage() {
  const { user } = useAuth();
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadLearners() {
    setLoading(true);
    try {
      const rows = await usersApi.list("learner", user?.id);
      setLearners(rows);
    } catch {
      showToast("Failed to load learners", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLearners(); }, []);

  const activeCount = useMemo(() => learners.filter(l => l.status === "Active").length, [learners]);
  const departmentCount = useMemo(() => new Set(learners.map(l => l.department).filter(Boolean)).size, [learners]);

  const filtered = useMemo(() => {
    if (!search) return learners;
    const q = search.toLowerCase();
    return learners.filter(l => l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.department?.toLowerCase().includes(q));
  }, [learners, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      // Don't delete the learner — just unassign them from this trainer
      await usersApi.update(deleteTarget.id, { trainerId: null });
      showToast(`${deleteTarget.name} removed from your roster.`);
      setDeleteTarget(null);
      await loadLearners();
    } catch {
      showToast("Failed to remove learner. Check backend connection.", "error");
    }
  };

  const handleAssigned = () => {
    showToast(`Simulation assigned to ${assignTarget?.name} successfully.`);
    setAssignTarget(null);
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Inter, sans-serif", minHeight: "100vh", background: "#f5f7f8" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 24, zIndex: 9999, padding: "12px 18px", borderRadius: 12, background: toast.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: toast.type === "error" ? "#ef4444" : "#22c55e", fontWeight: 600, fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}` }}>
          {toast.type === "error" ? "❌" : "✅"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Trainer Dashboard</h1>
          <p style={{ fontSize: 13, color: "#4b5563" }}>Manage your enrolled learners, assign simulations, or remove inactive accounts.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={loadLearners} style={{ padding: "9px 12px", background: "#f3f4f6", color: "#4b5563", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer", display: "flex", alignItems: "center" }} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Learners" value={learners.length} sub="In your roster" icon={Users} color="#3B6EF5" />
        <StatCard label="Active" value={activeCount} sub="Ready for training" icon={UserCheck} color="#22C55E" />
        <StatCard label="Departments" value={departmentCount} sub="Represented" icon={GraduationCap} color="#A855F7" />
        <StatCard label="Inactive" value={Math.max(learners.length - activeCount, 0)} sub="Pending review" icon={Clock3} color="#F59E0B" />
      </div>

      {/* Learner Table */}
      <div style={{ background: "#ffffff", borderRadius: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.05)", borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(0,0,0,0.1)" }}>
            <Search size={14} color="#9ca3af" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search learners by name, email, or department…"
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: '#111827', fontFamily: "Inter, sans-serif" }}
            />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={13} color="#9ca3af" /></button>}
          </div>
          <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: "nowrap" }}>{filtered.length} learners</span>
        </div>

        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: '#6b7280', fontSize: 13 }}>Loading learners…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: '#6b7280', fontSize: 13 }}>
            {search ? "No learners match your search." : 'No learners have selected you as their trainer yet.'}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Learner", "Email", "Department", "Batch", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(learner => (
                <tr key={learner.id} style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={learner.name} />
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{learner.name}</p>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Mail size={11} color="#9ca3af" />
                      <span style={{ fontSize: 12, color: "#4b5563" }}>{learner.email}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#4b5563" }}>{learner.department || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#4b5563" }}>{learner.batch || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: learner.status === "Active" ? "rgba(34,197,94,0.15)" : "rgba(0,0,0,0.05)", color: learner.status === "Active" ? "#22c55e" : "#4b5563" }}>
                      {learner.status || "Unknown"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setAssignTarget(learner)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        <BookOpen size={11} /> Assign
                      </button>
                      <button
                        onClick={() => setDeleteTarget(learner)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDeleteModal learner={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      <AssignSimulationModal learner={assignTarget} trainer={user} onAssigned={handleAssigned} onClose={() => setAssignTarget(null)} />
    </div>
  );
}
