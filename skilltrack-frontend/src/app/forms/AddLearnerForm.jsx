import { useState } from "react";
import { FormModal, FieldLabel, inputCls, FormActions } from "../components/shared/FormModal";
import { usersApi } from "../../api/usersApi";
import { useToast } from "../../platform/engine/context/ToastContext";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  department: "",
  organization: "",
  rollNumber: "",
  batch: "",
};

// Saves via POST /api/users (src/api/usersApi.js -> spring-api's
// UserController) and immediately shows up in whichever dashboard opened
// the form.
export function AddLearnerForm({ open, onOpenChange, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await usersApi.create({ role: "learner", ...form });
      toast.success(`Learner "${created.name}" added.`);
      onCreated?.(created);
      setForm(EMPTY);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Could not add learner.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Learner"
      description="Enroll a new learner. Saved locally until the backend exposes a learners endpoint."
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Full Name</FieldLabel>
            <input className={inputCls} value={form.name} onChange={set("name")} placeholder="Full name" />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={set("email")}
              placeholder="name@example.com"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Phone</FieldLabel>
            <input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="+91 ..." />
          </div>
          <div>
            <FieldLabel>Department</FieldLabel>
            <input className={inputCls} value={form.department} onChange={set("department")} placeholder="e.g. IT/DevOps" />
          </div>
        </div>
        <div>
          <FieldLabel>Organization</FieldLabel>
          <input
            className={inputCls}
            value={form.organization}
            onChange={set("organization")}
            placeholder="College / company name"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Roll Number</FieldLabel>
            <input className={inputCls} value={form.rollNumber} onChange={set("rollNumber")} />
          </div>
          <div>
            <FieldLabel>Batch</FieldLabel>
            <input className={inputCls} value={form.batch} onChange={set("batch")} placeholder="2021-2025" />
          </div>
        </div>
        {error && <p className="text-[11px] text-red-500">{error}</p>}
        <FormActions onCancel={() => onOpenChange(false)} submitting={submitting} submitLabel="Add Learner" />
      </form>
    </FormModal>
  );
}
