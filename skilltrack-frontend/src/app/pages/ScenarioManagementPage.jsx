import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, ShieldAlert, Database } from "lucide-react";
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
import { scenariosApi } from "../../api/scenariosApi";
import { notificationsApi } from "../../api/notificationsApi";
import { usersApi } from "../../api/usersApi";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { useToast } from "../../platform/engine/context/ToastContext";
import { AddScenarioForm } from "../forms/AddScenarioForm";
import {
  FormModal,
  FieldLabel,
  FormActions,
  inputCls,
  textareaCls,
  selectCls,
  FieldError,
} from "../components/shared/FormModal";
import { Badge, BackendErrorNotice, LocalDataNotice } from "../components/shared/atoms";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

function sourceColor(source) {
  return source === "local" ? "orange" : "blue";
}

function emptyDraft() {
  return {
    simulation_id: "",
    title: "",
    branch: "All",
    level: 1,
    goal: "",
    status: "Draft",
    sops: [],
  };
}

export function ScenarioManagementPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [backendError, setBackendError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadRows() {
    setLoading(true);
    const result = await scenariosApi.list();
    setRows(result.rows);
    setBackendError(result.backendError);
    setLoading(false);
  }

  useEffect(() => {
    loadRows();
  }, []);

  function openEdit(row) {
    setEditingRow(row);
    setDraft({
      simulation_id: row.simulation_id,
      title: row.title || "",
      branch: row.branch || "All",
      level: row.level || 1,
      goal: row.goal || "",
      status: row.status || "Active",
      sops: row.raw?.sop_steps?.map(s => ({
        instruction: s.instruction || "",
        expected_action: s.expected_action || "",
        hint: s.hint || ""
      })) || [{ instruction: "", expected_action: "", hint: "" }],
    });
    setError("");
    setEditOpen(true);
  }

  function set(key) {
    return (e) => setDraft((current) => ({ ...current, [key]: e.target.value }));
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingRow) return;
    if (!draft.title.trim() || !draft.goal.trim()) {
      setError("Title and goal are required.");
      return;
    }
    if (draft.sops.length === 0 || draft.sops.some(s => !s.instruction.trim() || !s.expected_action.trim())) {
      setError("At least one SOP is required, and all SOPs must have Instruction and Expected Action/Answer.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await scenariosApi.update(
        editingRow.simulation_id,
        {
          title: draft.title.trim(),
          branch: draft.branch,
          level: Number(draft.level) || 1,
          goal: draft.goal.trim(),
          status: draft.status,
          sop_steps: draft.sops.map((s, i) => ({
             step_id: `${editingRow.simulation_id}_STEP_${i + 1}`,
             order: i + 1,
             instruction: s.instruction.trim(),
             expected_action: s.expected_action.trim(),
             is_safety_critical: true,
             hint: s.hint.trim() || "Review the standard procedures."
          }))
        }
      );
      toast.success(`Scenario "${draft.title.trim()}" updated.`);

      // Always notify admins when trainer modifies a scenario
      try {
        const allUsers = await usersApi.list();
        const adminIds = allUsers.filter(u => u.role === "admin").map(a => a.id);
        await notificationsApi.notifyAdminsOfTrainerAction({
          adminIds,
          trainerId: user?.id,
          trainerName: user?.name || "A Trainer",
          action: "Modified",
          itemId: editingRow.simulation_id,
          itemTitle: draft.title.trim()
        });
      } catch (e) {
        console.error("Failed to notify admins", e);
      }

      setEditOpen(false);
      setEditingRow(null);
      await loadRows();
    } catch (err) {
      setError(err.message || "Could not update scenario.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await scenariosApi.remove(deleteTarget.simulation_id);
      toast.info("Scenario deleted.");
      await loadRows();
    } catch (err) {
      toast.error(err.message || "Could not delete scenario.");
    } finally {
      setDeleteTarget(null);
    }
  }

  const addSop = () => setDraft(curr => ({ ...curr, sops: [...curr.sops, { instruction: "", expected_action: "", hint: "" }] }));
  const removeSop = (idx) => setDraft(curr => ({ ...curr, sops: curr.sops.filter((_, i) => i !== idx) }));
  const setSop = (idx, field, value) => setDraft(curr => {
    const newSops = [...curr.sops];
    newSops[idx] = { ...newSops[idx], [field]: value };
    return { ...curr, sops: newSops };
  });

  if (loading) {
    return <div style={{ padding: "20px", fontSize: 13, color: "#4b5563", background: "#f5f7f8", minHeight: "100vh" }}>Loading scenarios…</div>;
  }

  return (
    <div style={{ padding: "20px", background: "#f5f7f8", minHeight: "100vh", fontFamily: "Inter, sans-serif" }} className="space-y-4">

      {backendError && (
        <BackendErrorNotice>
          {backendError} The table is showing only local scenarios until the backend becomes reachable again.
        </BackendErrorNotice>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Scenario Management</h1>
          <p style={{ fontSize: 13, color: "#4b5563", marginTop: 2 }}>Review backend simulations and manage local scenario overlays from the same UI.</p>
        </div>
        {user?.role !== "admin" && (
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus size={15} /> Add New Scenario
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div style={{ background: "#ffffff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: "#4b5563" }}>Total Scenarios</p>
            <Database size={15} className="text-blue-500" />
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{rows.length}</p>
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Backend + local overlay</p>
        </div>
        <div style={{ background: "#ffffff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: "#4b5563" }}>Backend Rows</p>
            <ShieldAlert size={15} className="text-emerald-500" />
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{rows.filter((row) => row.source === "backend").length}</p>
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Read from `/api/simulations`</p>
        </div>
        <div style={{ background: "#ffffff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: "#4b5563" }}>Local Rows</p>
            <ShieldAlert size={15} className="text-amber-500" />
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{rows.filter((row) => row.source === "local").length}</p>
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Created only in this browser</p>
        </div>
        <div style={{ background: "#ffffff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: "#4b5563" }}>Connection</p>
            <ShieldAlert size={15} className={backendError ? "text-red-500" : "text-blue-500"} />
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{backendError ? "Local" : "Hybrid"}</p>
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>{backendError ? "Backend offline" : "Backend list + local edits"}</p>
        </div>
      </div>

      {/* Table Panel */}
      <div style={{ background: "#ffffff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.4)", border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Scenario Library</h2>
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Local rows are tagged so it is obvious what is real vs browser-only.</p>
          </div>
          <Badge color="gray">{rows.length} rows</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow style={{ background: "#f9fafb" }} className="text-xs hover:bg-transparent">
              {["Scenario", "Branch", "Level", "Source", "Status", "Actions"].map((heading) => (
                <TableHead key={heading} style={{ color: '#6b7280', fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }} className="px-4 py-2.5 h-auto">
                  {heading}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody style={{ borderColor: "rgba(0,0,0,0.05)" }}>
            {rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.simulation_id}
                  style={{ borderColor: "rgba(0,0,0,0.05)" }}
                  className="transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <TableCell className="px-4 py-3">
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{row.title}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{row.simulation_id}</p>
                    </div>
                  </TableCell>
                  <TableCell style={{ fontSize: 12, color: "#4b5563" }} className="px-4 py-3">{row.branch || "—"}</TableCell>
                  <TableCell style={{ fontSize: 12, color: "#4b5563" }} className="px-4 py-3">Level {row.level ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge color={sourceColor(row.source)}>{row.source}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge color={row.status === "Pending Approval" ? "blue" : row.status === "Draft" ? "orange" : "green"}>{row.status || "Active"}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user?.role !== "admin" && (
                        <button
                          onClick={() => openEdit(row)}
                          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", color: "#4b5563", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.06)"; e.currentTarget.style.color = "#ffffff"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#4b5563"; }}
                          title="Edit scenario"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(row)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.18)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                        title="Delete scenario"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: '#6b7280' }}>
                  No scenarios available yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AddScenarioForm
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          loadRows();
        }}
      />

      <FormModal
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingRow(null);
            setDraft(emptyDraft());
            setError("");
          }
        }}
        title="Edit Scenario"
        description="These edits are stored locally. Backend rows are overlaid in the browser; local rows are updated directly."
      >
        <form onSubmit={handleUpdate} className="space-y-3.5 pt-1">
          <div>
            <FieldLabel>Simulation ID</FieldLabel>
            <input className={`${inputCls} bg-gray-50 text-gray-400`} value={draft.simulation_id} disabled />
          </div>
          <div>
            <FieldLabel>Title</FieldLabel>
            <input className={inputCls} value={draft.title} onChange={set("title")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Branch</FieldLabel>
              <select className={selectCls} value={draft.branch} onChange={set("branch")}>
                {["All", "Electrical", "Mechanical", "IT/DevOps"].map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Level</FieldLabel>
              <select className={selectCls} value={draft.level} onChange={set("level")}>
                {[1, 2, 3, 4].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <select className={selectCls} value={draft.status} onChange={set("status")}>
              {["Draft", "Pending Approval", "Active", "Archived"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Goal</FieldLabel>
            <textarea rows={4} className={textareaCls.replace("font-mono text-[12px]", "")} value={draft.goal} onChange={set("goal")} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>Standard Operating Procedures (SOPs)</FieldLabel>
              <button type="button" onClick={addSop} className="text-[11px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1">
                <Plus size={12} /> Add SOP
              </button>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {draft.sops.map((sop, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-gray-200 bg-gray-50 relative">
                  <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Step {idx + 1}</p>
                  {draft.sops.length > 1 && (
                    <button type="button" onClick={() => removeSop(idx)} className="absolute top-3 right-3 text-red-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="space-y-2">
                    <input className={inputCls} placeholder="Instruction" value={sop.instruction} onChange={(e) => setSop(idx, "instruction", e.target.value)} />
                    <input className={inputCls} placeholder="Expected Action/Answer" value={sop.expected_action} onChange={(e) => setSop(idx, "expected_action", e.target.value)} />
                    <input className={inputCls} placeholder="Hint (optional)" value={sop.hint} onChange={(e) => setSop(idx, "hint", e.target.value)} />
                  </div>
                </div>
              ))}
              {draft.sops.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No SOPs added. At least one is required.</p>
              )}
            </div>
          </div>

          <FieldError>{error}</FieldError>
          <FormActions onCancel={() => setEditOpen(false)} submitting={submitting} submitLabel="Save Scenario" />
        </form>
      </FormModal>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&ldquo;{deleteTarget?.title}&rdquo;</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
