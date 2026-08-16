import { useState } from "react";
import { FormModal, FieldError, FormActions, inputCls, textareaCls, selectCls, FieldLabel } from "../components/shared/FormModal";
import { scenariosApi, validateScenarioJson } from "../../api/scenariosApi";
import { notificationsApi } from "../../api/notificationsApi";
import { usersApi } from "../../api/usersApi";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { useToast } from "../../platform/engine/context/ToastContext";
import { Plus, Trash2 } from "lucide-react";

export function AddScenarioForm({ open, onOpenChange, onCreated }) {
  const { user } = useAuth();
  const toast = useToast();
  const [draft, setDraft] = useState({
    title: "",
    branch: "All",
    level: 1,
    status: "Draft",
    goal: "",
    sops: [{ instruction: "", expected_action: "", hint: "" }]
  });
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when opened
  if (open && draft.title === "" && draft.goal === "" && draft.sops.length === 1 && !draft.sops[0].instruction) {
    // Keep it as is
  }

  const set = (key) => (e) => setDraft(curr => ({ ...curr, [key]: e.target.value }));

  const addSop = () => setDraft(curr => ({ ...curr, sops: [...curr.sops, { instruction: "", expected_action: "", hint: "" }] }));
  const removeSop = (idx) => setDraft(curr => ({ ...curr, sops: curr.sops.filter((_, i) => i !== idx) }));
  const setSop = (idx, field, value) => setDraft(curr => {
    const newSops = [...curr.sops];
    newSops[idx] = { ...newSops[idx], [field]: value };
    return { ...curr, sops: newSops };
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    if (!draft.title.trim() || !draft.goal.trim()) {
      setErrors(["Title and Goal are required."]);
      setSubmitting(false);
      return;
    }

    if (draft.sops.length === 0 || draft.sops.some(s => !s.instruction.trim() || !s.expected_action.trim())) {
      setErrors(["At least one SOP is required, and all SOPs must have Instruction and Expected Action/Answer."]);
      setSubmitting(false);
      return;
    }

    const simId = scenariosApi.newDraftId();
    const payload = {
      simulation_id: simId,
      title: draft.title.trim(),
      branch: draft.branch,
      level: Number(draft.level),
      interaction_pattern: "checklist",
      goal: draft.goal.trim(),
      prerequisites: [],
      time_limit_seconds: 600,
      sop_steps: draft.sops.map((s, i) => ({
        step_id: `${simId}_STEP_${i + 1}`,
        order: i + 1,
        instruction: s.instruction.trim(),
        expected_action: s.expected_action.trim(),
        is_safety_critical: true,
        hint: s.hint.trim() || "Review the standard procedures."
      })),
      decision_points: [],
      possible_mistakes: [],
      hints: draft.sops.filter(s => s.hint.trim()).map((s, i) => ({ hint_id: `HINT_${i}`, text: s.hint.trim(), penalty: 5 })),
      competencies: ["Safety Awareness", "Procedure Compliance"],
      competency_weights: { "Safety Awareness": 0.5, "Procedure Compliance": 0.5 },
      scoring: { base_score: 100, pass_threshold: 70, time_bonus_enabled: false },
      recommendation_rules: [],
      status: draft.status
    };

    const validationErrors = validateScenarioJson(payload);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setSubmitting(false);
      return;
    }

    try {
      const created = await scenariosApi.create(payload);
      toast.success(`Scenario "${created.title}" added.`);

      // Always notify admins when trainer creates a scenario
      try {
        const allUsers = await usersApi.list();
        const adminIds = allUsers.filter(u => u.role === "admin").map(a => a.id);
        await notificationsApi.notifyAdminsOfTrainerAction({
          adminIds,
          trainerId: user?.id,
          trainerName: user?.name || "A Trainer",
          action: "Created",
          itemId: created.simulation_id || simId,
          itemTitle: created.title || draft.title.trim()
        });
      } catch (e) {
        console.error("Failed to notify admins", e);
      }

      onCreated?.(created);
      onOpenChange(false);
      setDraft({ title: "", branch: "All", level: 1, status: "Draft", goal: "", sops: [{ instruction: "", expected_action: "", hint: "" }] });
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Scenario"
      description="Create a new interactive simulation scenario with standard operating procedures (SOPs)."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div>
          <FieldLabel>Title</FieldLabel>
          <input className={inputCls} placeholder="E.g. Fix Apache Server" value={draft.title} onChange={set("title")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Branch</FieldLabel>
            <select className={selectCls} value={draft.branch} onChange={set("branch")}>
              {["All", "Electrical", "Mechanical", "IT/DevOps"].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Level</FieldLabel>
            <select className={selectCls} value={draft.level} onChange={set("level")}>
              {[1, 2, 3, 4].map((l) => <option key={l} value={l}>Level {l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select className={selectCls} value={draft.status} onChange={set("status")}>
            {["Draft", "Pending Approval", "Active"].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Goal</FieldLabel>
          <textarea rows={2} className={textareaCls} placeholder="Describe the main objective of this simulation..." value={draft.goal} onChange={set("goal")} />
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
                  <input className={inputCls} placeholder="Instruction (e.g. Restart the apache2 service)" value={sop.instruction} onChange={(e) => setSop(idx, "instruction", e.target.value)} />
                  <input className={inputCls} placeholder="Expected Action/Answer (e.g. systemctl restart apache2)" value={sop.expected_action} onChange={(e) => setSop(idx, "expected_action", e.target.value)} />
                  <input className={inputCls} placeholder="Hint (optional)" value={sop.hint} onChange={(e) => setSop(idx, "hint", e.target.value)} />
                </div>
              </div>
            ))}
            {draft.sops.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No SOPs added. At least one is required.</p>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
            {errors.map((err, i) => (
              <FieldError key={i}>{err}</FieldError>
            ))}
          </div>
        )}
        <FormActions onCancel={() => onOpenChange(false)} submitting={submitting} submitLabel="Save Scenario" />
      </form>
    </FormModal>
  );
}
