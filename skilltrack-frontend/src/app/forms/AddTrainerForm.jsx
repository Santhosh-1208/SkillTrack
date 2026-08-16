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
  specialization: "",
  experienceYears: "",
};

// Saves via POST /api/users (src/api/usersApi.js -> spring-api's
// UserController).
export function AddTrainerForm({ open, onOpenChange, onCreated }) {
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
      const created = await usersApi.create({
        role: "trainer",
        ...form,
        experienceYears: Number(form.experienceYears) || 0,
      });
      toast.success(`Trainer "${created.name}" added.`);
      onCreated?.(created);
      setForm(EMPTY);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Could not add trainer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Trainer"
      description="Onboard a new trainer. Saved locally until the backend exposes a trainers endpoint."
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
            <input
              className={inputCls}
              value={form.department}
              onChange={set("department")}
              placeholder="e.g. Safety & Compliance"
            />
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
            <FieldLabel>Specialization</FieldLabel>
            <input
              className={inputCls}
              value={form.specialization}
              onChange={set("specialization")}
              placeholder="e.g. Electrical Safety"
            />
          </div>
          <div>
            <FieldLabel>Years of Experience</FieldLabel>
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.experienceYears}
              onChange={set("experienceYears")}
            />
          </div>
        </div>
        {error && <p className="text-[11px] text-red-500">{error}</p>}
        <FormActions onCancel={() => onOpenChange(false)} submitting={submitting} submitLabel="Add Trainer" />
      </form>
    </FormModal>
  );
}
