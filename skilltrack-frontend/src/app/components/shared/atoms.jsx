import { Star, AlertTriangle, WifiOff } from "lucide-react";

/* ── CircularProgress ──────────────────────────────────────────── */
export function CircularProgress({ value, size = 80, strokeWidth = 8, color = "#0056D2" }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, value)) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {/* Light track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,86,210,0.1)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

/* ── Stars ─────────────────────────────────────────────────────── */
export function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i} size={15}
          className={
            i <= Math.floor(rating)
              ? "fill-yellow-400 text-yellow-400"
              : i - 0.5 <= rating
                ? "fill-yellow-300 text-yellow-300"
                : "text-gray-300"
          }
        />
      ))}
    </div>
  );
}

/* ── Badge ─────────────────────────────────────────────────────── */
const BADGE_STYLE = {
  blue:   { background: "rgba(0,86,210,0.1)",     color: "#0056D2" },
  green:  { background: "rgba(34,197,94,0.12)",   color: "#16a34a" },
  orange: { background: "rgba(245,158,11,0.12)",  color: "#d97706" },
  red:    { background: "rgba(220,38,38,0.1)",    color: "#dc2626" },
  purple: { background: "rgba(139,92,246,0.1)",   color: "#7c3aed" },
  gray:   { background: "#f3f4f6",                color: "#6b7280" },
};

export const BADGE_COLORS = {
  blue:   "bg-blue-100 text-blue-700",
  green:  "bg-emerald-100 text-emerald-700",
  orange: "bg-amber-100 text-amber-700",
  red:    "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
  gray:   "bg-gray-100 text-gray-600",
};

export function Badge({ children, color = "blue" }) {
  const s = BADGE_STYLE[color] ?? BADGE_STYLE.blue;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 100,
      fontSize: 11, fontWeight: 600,
      background: s.background, color: s.color,
    }}>
      {children}
    </span>
  );
}

/* ── StatCard ──────────────────────────────────────────────────── */
export function StatCard({ label, value, sub, icon: Icon, color = "#0056D2" }) {
  return (
    <div style={{
      background: "#ffffff", borderRadius: 12, padding: "16px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{label}</p>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: color + "18" }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <p style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

/* ── LocalDataNotice ───────────────────────────────────────────── */
export function LocalDataNotice({ children }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
      color: "#d97706", borderRadius: 10, padding: "10px 14px", fontSize: 11,
    }}>
      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
      <span><strong>Local data: </strong>{children}</span>
    </div>
  );
}

/* ── BackendErrorNotice ────────────────────────────────────────── */
export function BackendErrorNotice({ children }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)",
      color: "#dc2626", borderRadius: 10, padding: "10px 14px", fontSize: 11,
    }}>
      <WifiOff size={13} style={{ flexShrink: 0, marginTop: 1 }} />
      <span><strong>Backend unreachable: </strong>{children}</span>
    </div>
  );
}
