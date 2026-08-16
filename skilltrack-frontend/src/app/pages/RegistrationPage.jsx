import { useState } from "react";
import { Cpu, ChevronLeft } from "lucide-react";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { useToast } from "../../platform/engine/context/ToastContext";
import { useNavigate } from "react-router-dom";

export function RegistrationPage({ onNavigate }) {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", username: "", phone: "", department: "", role: "learner",
    email: "", organization: "College of Engineering",
    rollNumber: "", batch: "", specialization: "",
    experienceYears: "", accessLevel: "", password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleRegister() {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const draft = {
        role: form.role,
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        department: form.department.trim() || "General",
        organization: form.organization.trim(),
        password: form.password.trim() || (form.role + "123"),
        ...(form.role === "learner" ? { rollNumber: form.rollNumber, batch: form.batch } : {}),
        ...(form.role === "trainer" ? { specialization: form.specialization, experienceYears: Number(form.experienceYears) || 0 } : {}),
        ...(form.role === "admin" ? { accessLevel: form.accessLevel || "Admin" } : {}),
      };
      const user = await register(draft);
      toast.success(`Account created. Welcome, ${user.name}!`);
      const dest = user.role === "trainer" ? "trainer-dashboard" : user.role === "admin" ? "admin-dashboard" : "learner-dashboard";
      onNavigate(dest);
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "11px 14px",
    background: "rgba(0,0,0,0.05)",
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: 8, color: "#1f2937", fontSize: 13,
    outline: "none", fontFamily: "Inter, sans-serif",
    boxSizing: "border-box", transition: "border-color 0.2s, background 0.2s",
  };
  const labelStyle = {
    display: "block", color: "#374151", fontSize: 11,
    fontWeight: 600, marginBottom: 6, letterSpacing: "0.04em",
  };
  const focusIn = e => { e.target.style.borderColor = "#0056D2"; e.target.style.background = "#ffffff"; };
  const focusOut = e => { e.target.style.borderColor = "rgba(0,0,0,0.1)"; e.target.style.background = "rgba(0,0,0,0.05)"; };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7f8", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative" }}>
      {/* Back */}
      <button
        onClick={() => navigate("/")}
        style={{ position: "absolute", top: 24, left: 24, display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4b5563", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        onMouseEnter={e => e.currentTarget.style.color = "#111827"}
        onMouseLeave={e => e.currentTarget.style.color = "#4b5563"}
      >
        <ChevronLeft size={15} /> Back to Home
      </button>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 480, background: '#ffffff', border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: "40px 36px", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 34, height: 34, background: "#0056D2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(0,86,210,0.4)" }}>
            <Cpu size={17} color="#fff" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em", color: "#1f2937" }}>
            SKILL<span style={{ color: "#0056D2" }}>TRACK</span>
          </span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1f2937", marginBottom: 4, letterSpacing: "-0.02em" }}>Create Account</h1>
        <p style={{ color: "#4b5563", fontSize: 13, marginBottom: 28 }}>Join SkillTrack and start your simulation training journey.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name & Username */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>FULL NAME</label>
              <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="Arun V" onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={labelStyle}>USERNAME</label>
              <input style={inputStyle} value={form.username} onChange={set("username")} placeholder="arun_v" onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input type="email" style={inputStyle} value={form.email} onChange={set("email")} placeholder="arun@example.com" onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>MOBILE NUMBER</label>
            <input type="tel" style={inputStyle} value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>PASSWORD</label>
            <input type="password" style={inputStyle} value={form.password} onChange={set("password")} placeholder="Choose a password (min 6 chars)" autoComplete="new-password" onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Department + Role */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>DEPARTMENT</label>
              <input style={inputStyle} value={form.department} onChange={set("department")} placeholder="IT/DevOps" onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={labelStyle}>ROLE</label>
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                value={form.role} onChange={set("role")}
                onFocus={focusIn} onBlur={focusOut}
              >
                <option value="learner" style={{ background: '#ffffff' }}>Learner</option>
                <option value="trainer" style={{ background: '#ffffff' }}>Trainer</option>
                <option value="admin" style={{ background: '#ffffff' }}>Admin</option>
              </select>
            </div>
          </div>

          {/* Role-specific fields */}
          {form.role === "learner" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>ROLL NUMBER</label>
                <input style={inputStyle} value={form.rollNumber} onChange={set("rollNumber")} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={labelStyle}>BATCH</label>
                <input style={inputStyle} value={form.batch} onChange={set("batch")} placeholder="2021-2025" onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>
          )}
          {form.role === "trainer" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>SPECIALIZATION</label>
                <input style={inputStyle} value={form.specialization} onChange={set("specialization")} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={labelStyle}>YEARS EXP.</label>
                <input type="number" min="0" style={inputStyle} value={form.experienceYears} onChange={set("experienceYears")} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>
          )}
          {form.role === "admin" && (
            <div>
              <label style={labelStyle}>ACCESS LEVEL</label>
              <input style={inputStyle} value={form.accessLevel} onChange={set("accessLevel")} placeholder="Super Admin" onFocus={focusIn} onBlur={focusOut} />
            </div>
          )}

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={submitting}
            style={{ width: "100%", padding: "13px", background: submitting ? "rgba(0,86,210,0.5)" : "#0056D2", color: '#ffffff', border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: submitting ? "default" : "pointer", fontFamily: "inherit", transition: "transform 0.15s", marginTop: 4 }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {submitting ? "Creating account..." : "Create Account"}
          </button>

          <p style={{ textAlign: "center", color: "#4b5563", fontSize: 13, margin: "4px 0 0" }}>
            Already have an account?{" "}
            <button
              style={{ background: "none", border: "none", color: "#0056D2", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
              onClick={() => onNavigate("login")}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
