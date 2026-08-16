import { useState } from "react";
import { Cpu, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { useToast } from "../../platform/engine/context/ToastContext";
import { useNavigate } from "react-router-dom";

export function LoginPage({ onNavigate }) {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const user = await login({ username: username.trim(), password });
      toast.success(`Welcome back, ${user.name}!`);
      const dest =
        user.role === "trainer" ? "trainer-dashboard"
        : user.role === "admin" ? "admin-dashboard"
        : "learner-dashboard";
      onNavigate(dest);
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "13px 16px",
    background: "rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: 8, color: "#1f2937", fontSize: 14,
    outline: "none", fontFamily: "Inter, sans-serif",
    transition: "border-color 0.2s, background 0.2s",
    boxSizing: "border-box",
  };

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
      <div style={{ width: "100%", maxWidth: 480, background: '#ffffff', border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: "40px 36px", boxShadow: "0 24px 60px rgba(0,0,0,0.08)" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 34, height: 34, background: "#0056D2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(0,86,210,0.4)" }}>
            <Cpu size={17} color="#fff" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em", color: "#1f2937" }}>
            SKILL<span style={{ color: "#0056D2" }}>TRACK</span>
          </span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1f2937", marginBottom: 4, letterSpacing: "-0.02em" }}>Sign in</h1>
        <p style={{ color: "#4b5563", fontSize: 13, marginBottom: 28 }}>Welcome back! Enter your credentials to continue.</p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", color: "#374151", fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: "0.04em" }}>USERNAME</label>
            <input
              id="login-username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = "#0056D2"; e.target.style.background = "#ffffff"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(0,0,0,0.1)"; e.target.style.background = "rgba(0,0,0,0.06)"; }}
            />
          </div>

          <div>
            <label style={{ display: "block", color: "#374151", fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: "0.04em" }}>PASSWORD</label>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => { e.target.style.borderColor = "#0056D2"; e.target.style.background = "#ffffff"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(0,0,0,0.1)"; e.target.style.background = "rgba(0,0,0,0.06)"; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: '#6b7280', cursor: "pointer", padding: 0 }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "14px", background: loading ? "rgba(0,86,210,0.5)" : "#0056D2", color: '#ffffff', border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "inherit", transition: "transform 0.15s", marginTop: 4 }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(0,0,0,0.06)", textAlign: "center" }}>
          <p style={{ color: "#4b5563", fontSize: 13 }}>
            New to SkillTrack?{" "}
            <button
              onClick={() => onNavigate("register")}
              style={{ background: "none", border: "none", color: "#0056D2", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
