import { useState } from "react";
import { FormModal, FieldLabel, inputCls, FormActions } from "../components/shared/FormModal";
import { usersApi } from "../../api/usersApi";
import { useToast } from "../../platform/engine/context/ToastContext";

// Edit Profile works for all three roles (learner / trainer / admin). Saves
// go through usersApi (PUT /api/users/{id} -> spring-api's UserController).
export function EditProfileForm({ open, onOpenChange, user, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    organization: user?.organization || "",
    department: user?.department || "",
    rollNumber: user?.rollNumber || "",
    batch: user?.batch || "",
    specialization: user?.specialization || "",
    experienceYears: user?.experienceYears ?? "",
    accessLevel: user?.accessLevel || "",
    blog: user?.blog || "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;
  const role = user.role;

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
      const patch = {
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        organization: form.organization.trim(),
        department: form.department.trim(),
        ...(role === "learner" ? { rollNumber: form.rollNumber, batch: form.batch } : {}),
        ...(role === "trainer"
          ? { specialization: form.specialization, experienceYears: Number(form.experienceYears) || 0, blog: form.blog.trim() }
          : {}),
        ...(role === "admin" ? { accessLevel: form.accessLevel } : {}),
      };
      const updated = await usersApi.update(user.id, patch);
      toast.success("Profile updated.");
      onSaved?.(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Could not save profile.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Profile"
      description={`Update ${role} profile details. Saved locally until the backend exposes a users endpoint.`}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Full Name</FieldLabel>
            <input className={inputCls} value={form.name} onChange={set("name")} placeholder="Full name" />
          </div>
          <div>
            <FieldLabel>Username</FieldLabel>
            <input className={inputCls} value={form.username} onChange={set("username")} placeholder="Username" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
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

        {role === "learner" && (
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
        )}

        {role === "trainer" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Specialization</FieldLabel>
                <input className={inputCls} value={form.specialization} onChange={set("specialization")} />
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
            <div>
              <FieldLabel>Blog / Bio</FieldLabel>
              <textarea 
                className={inputCls} 
                style={{ resize: "vertical", minHeight: "80px" }}
                value={form.blog} 
                onChange={set("blog")} 
                placeholder="Write a short description to attract learners..."
              />
            </div>
          </>
        )}

        {role === "admin" && (
          <div>
            <FieldLabel>Access Level</FieldLabel>
            <input
              className={inputCls}
              value={form.accessLevel}
              onChange={set("accessLevel")}
              placeholder="e.g. Super Admin"
            />
          </div>
        )}

        {error && <p className="text-[11px] text-red-500">{error}</p>}
        <FormActions onCancel={() => onOpenChange(false)} submitting={submitting} submitLabel="Save Changes" />
      </form>
    </FormModal>
  );
}
