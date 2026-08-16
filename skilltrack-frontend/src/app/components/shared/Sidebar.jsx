import {
  LayoutDashboard,
  Zap,
  Brain,
  BarChart2,
  Trophy,
  Bell,
  User,
  Shield,
  Users,
  Activity,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../../../platform/engine/context/AuthContext";
import { AIChatWidget } from "./AIChatWidget";

// Each role only ever sees its own dashboard + the features that apply to it.
// No learner should see Trainer/Admin links, and vice versa.
const NAV_BY_ROLE = {
  learner: [
    [
      { id: "learner-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "simulation", label: "Simulations", icon: Zap },
      { id: "explore-trainers", label: "Explore Trainers", icon: Users },
      { id: "ai-feedback", label: "AI Feedback", icon: Brain },
      { id: "analytics", label: "Analytics", icon: TrendingUp },
      { id: "leaderboard", label: "Leaderboard", icon: Trophy },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "profile", label: "Profile", icon: User },
    ],
  ],
  trainer: [
    [
      { id: "trainer-dashboard", label: "Dashboard", icon: Users },
      { id: "scenario-management", label: "Scenarios", icon: BookOpen },
      { id: "ai-feedback", label: "AI Feedback", icon: Brain },
      { id: "analytics", label: "Analytics", icon: TrendingUp },
      { id: "leaderboard", label: "Leaderboard", icon: Trophy },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "profile", label: "Profile", icon: User },
    ],
  ],
  admin: [
    [
      { id: "admin-dashboard", label: "Dashboard", icon: Activity },
      { id: "scenario-management", label: "Scenarios", icon: BookOpen },
      { id: "analytics", label: "Analytics", icon: TrendingUp },
      { id: "leaderboard", label: "Leaderboard", icon: Trophy },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "profile", label: "Profile", icon: User },
    ],
  ],
};
const NAV_LABELS_BY_ROLE = {
  learner: ["Learner"],
  trainer: ["Trainer"],
  admin: ["Admin"],
};

export function Sidebar({ current, onChange }) {
  const { user, logout } = useAuth();
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "?";
  const role = user?.role || "learner";
  const NAV = NAV_BY_ROLE[role] || NAV_BY_ROLE.learner;
  const NAV_LABELS = NAV_LABELS_BY_ROLE[role] || NAV_LABELS_BY_ROLE.learner;

  return (
    <aside style={{
      width: 208, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column",
      background: "#ffffff",
      borderRight: "1px solid #e5e7eb",
      overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 18px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: "#0056D2", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(0,86,210,0.3)", flexShrink: 0 }}>
            <Shield size={14} color="#fff" />
          </div>
          <div>
            <p style={{ color: "#1f2937", fontWeight: 900, fontSize: 13, letterSpacing: "-0.01em", lineHeight: 1, margin: 0 }}>
              SKILL<span style={{ color: "#0056D2" }}>TRACK</span>
            </p>
            <p style={{ color: "#9ca3af", fontSize: 9, lineHeight: 1, marginTop: 3 }}>Simulation Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 8 }}>
            <p style={{ color: "#9ca3af", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 10px 6px", margin: 0 }}>
              {NAV_LABELS[gi]}
            </p>
            {group.map(({ id, label, icon: Icon }) => {
              const isActive = current === id;
              return (
                <button
                  key={id}
                  onClick={() => onChange(id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 6, marginBottom: 1,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    background: isActive ? "rgba(0,86,210,0.08)" : "transparent",
                    color: isActive ? "#0056D2" : "#4b5563",
                    borderLeft: `3px solid ${isActive ? "#0056D2" : "transparent"}`,
                    transition: "all 0.15s ease",
                    position: "relative",
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#1f2937"; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#4b5563"; } }}
                >
                  <Icon size={15} style={{ color: isActive ? "#0056D2" : "inherit", flexShrink: 0 }} />
                  {label}
                </button>
              );
            })}
          </div>
        ))}

        {/* AI Chat Widget — available for all roles */}
        <div style={{ marginTop: 4 }}>
          <p style={{ color: "#9ca3af", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 10px 6px", margin: 0 }}>
            Assistant
          </p>
          <AIChatWidget />
        </div>
      </nav>

      {/* User profile */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid #e5e7eb" }}>
        <button
          onClick={() => onChange("profile")}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#0056D2", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ minWidth: 0, textAlign: "left" }}>
            <p style={{ color: "#1f2937", fontSize: 12, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "Guest"}</p>
            <p style={{ color: "#9ca3af", fontSize: 10, margin: 0, textTransform: "capitalize" }}>{user?.role || "Learner"}</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
