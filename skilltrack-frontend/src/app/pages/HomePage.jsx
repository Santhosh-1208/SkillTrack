import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Terminal, Shield, Cpu, ChevronRight, Play, Star,
  GitBranch, Lock, Wifi, CheckCircle, Zap, Brain, Trophy, Users
} from "lucide-react";

/* ── Demo simulation data ─────────────────────────────── */
const DEMO_SIMS = [
  {
    id: "git",
    tag: "GIT / VERSION CONTROL",
    title: "Resolve a Git Merge Conflict",
    level: "Intermediate",
    levelColor: "#f59e0b",
    category: "Computer Science",
    description: "A critical production branch has diverged. Identify conflict markers, preserve both teammates' changes, and push a clean merge commit — under time pressure.",
    icon: GitBranch,
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    accentColor: "#3b82f6",
    preview: [
      { t: "git fetch origin", c: "#22c55e" },
      { t: "git merge origin/main", c: "#f59e0b" },
      { t: "CONFLICT (content): login.js", c: "#ef4444" },
      { t: "Automatic merge failed; fix conflicts.", c: "#ef4444" },
      { t: ">>> Resolve conflict manually <<<", c: "#a5b4fc" },
    ],
    stats: { players: "12.4K", rating: "4.8", time: "15 min" },
  },
  {
    id: "linux",
    tag: "LINUX / SYSADMIN",
    title: "Linux File Permissions Breach",
    level: "Beginner",
    levelColor: "#22c55e",
    category: "Computer Science",
    description: "A misconfigured server has exposed sensitive data via world-readable files. Navigate the filesystem, audit permissions, and lock down the system before the breach escalates.",
    icon: Lock,
    gradient: "linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a2e1a 100%)",
    accentColor: "#22c55e",
    preview: [
      { t: "ls -la /etc/shadow", c: "#ef4444" },
      { t: "-rw-r--r--  1 root root  ← DANGER!", c: "#ef4444" },
      { t: "chmod 640 /etc/shadow", c: "#22c55e" },
      { t: "chown root:shadow /etc/shadow", c: "#22c55e" },
      { t: "✓ Permissions hardened", c: "#4ade80" },
    ],
    stats: { players: "18.7K", rating: "4.9", time: "10 min" },
  },
  {
    id: "cyber",
    tag: "CYBERSECURITY",
    title: "Cyber Incident Response",
    level: "Advanced",
    levelColor: "#ef4444",
    category: "Computer Science",
    description: "A threat actor has breached your network. Analyse IDS logs, isolate the compromised host, trace the attack vector, and contain the incident before data exfiltration completes.",
    icon: Wifi,
    gradient: "linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 50%, #1a0d1a 100%)",
    accentColor: "#ef4444",
    preview: [
      { t: "[ALERT] Brute force: 192.168.1.105", c: "#ef4444" },
      { t: "iptables -A INPUT -s 192.168.1.105 -j DROP", c: "#f59e0b" },
      { t: "netstat -an | grep ESTABLISHED", c: "#a5b4fc" },
      { t: "[!] Suspicious process: nc -e /bin/sh", c: "#ef4444" },
      { t: "kill -9 4821  ← threat contained", c: "#22c55e" },
    ],
    stats: { players: "9.2K", rating: "4.7", time: "25 min" },
  },
];

const FEATURES = [
  { icon: Brain, title: "Gemini AI Coaching", desc: "Real-time feedback powered by Google Gemini — points out mistakes, explains consequences, guides improvement." },
  { icon: Terminal, title: "Live Sandbox Terminal", desc: "Run real Linux commands, Git operations, and security tools in isolated containers. No setup needed." },
  { icon: Trophy, title: "Competency Tracking", desc: "Detailed scoring across technical, analytical and procedural competencies with progress over time." },
  { icon: Zap, title: "Role-Based Simulations", desc: "50+ scenarios for learners, trainers and admins — from beginner Git workflows to advanced incident response." },
  { icon: Shield, title: "Enterprise Ready", desc: "Multi-role access control, trainer scenario builder, admin analytics, and full audit trails." },
];

/* ── Terminal preview card ────────────────────────────── */
function SimCard({ sim, index }) {
  const [hovered, setHovered] = useState(false);
  const Icon = sim.icon;
  return (
    <div
      className="nf-card relative overflow-hidden cursor-pointer"
      style={{ animationDelay: `${index * 0.15}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top preview area */}
      <div style={{ background: sim.gradient, minHeight: 200, padding: "24px 20px", position: "relative" }}>
        {/* Glow orb */}
        <div style={{
          position: "absolute", top: -40, right: -40, width: 150, height: 150,
          borderRadius: "50%", background: sim.accentColor + "20",
          filter: "blur(40px)", pointerEvents: "none",
          transition: "opacity 0.3s", opacity: hovered ? 1 : 0.5,
        }} />

        {/* Tag + icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ background: sim.accentColor + "22", border: `1px solid ${sim.accentColor}44`, borderRadius: 6, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon size={12} style={{ color: sim.accentColor }} />
            <span style={{ color: sim.accentColor, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>{sim.tag}</span>
          </div>
        </div>

        {/* Terminal preview */}
        <div style={{ background: "rgba(0,0,0,0.7)", borderRadius: 8, padding: "12px 14px", fontFamily: "'Courier New', monospace", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
            {["#ff5f57","#febc2e","#28c840"].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            ))}
          </div>
          {sim.preview.map((line, i) => (
            <div key={i} style={{ fontSize: 11, color: line.c, marginBottom: 3, opacity: hovered ? 1 : (i < 3 ? 1 : 0.4), transition: `opacity 0.3s ${i * 0.05}s` }}>
              <span style={{ color: '#6b7280', marginRight: 6 }}>{i === 0 ? "$" : ">"}</span>
              {line.t}
            </div>
          ))}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "18px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ background: sim.levelColor + "20", color: sim.levelColor, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
            {sim.level}
          </span>
          <span style={{ color: '#6b7280', fontSize: 10 }}>{sim.category}</span>
        </div>
        <h3 style={{ color: "#1f2937", fontSize: 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{sim.title}</h3>
        <p style={{ color: "#4b5563", fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>{sim.description}</p>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          {[
            { label: "Players", val: sim.stats.players },
            { label: "Rating", val: "⭐ " + sim.stats.rating },
            { label: "Duration", val: sim.stats.time },
          ].map(s => (
            <div key={s.label}>
              <p style={{ color: '#6b7280', fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{s.label}</p>
              <p style={{ color: "#e0e0e0", fontSize: 12, fontWeight: 600 }}>{s.val}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{ flex: 1, background: sim.accentColor, color: "#1f2937", border: "none", borderRadius: 6, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <Play size={12} fill="currentColor" /> Preview Demo
          </button>
          <button
            style={{ background: "rgba(0,0,0,0.06)", color: "#1f2937", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "9px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
          >
            Info
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Animated particle dots for hero ─────────────────── */
function Particles() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: 25 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${Math.random() * 100}%`,
            top: `${40 + Math.random() * 60}%`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            borderRadius: "50%",
            background: i % 3 === 0 ? "#0056D2" : i % 3 === 1 ? "#3b82f6" : "#ffffff",
            opacity: 0.4 + Math.random() * 0.4,
            animation: `particle-drift ${4 + Math.random() * 6}s ${Math.random() * 4}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main HomePage ────────────────────────────────────── */
export function HomePage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ background: "#f5f7f8", minHeight: "100vh", color: "#1f2937", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 5%",
        background: scrollY > 60
          ? "rgba(255,255,255,0.97)"
          : "linear-gradient(180deg, rgba(245,247,248,0.9) 0%, transparent 100%)",
        backdropFilter: scrollY > 60 ? "blur(12px)" : "none",
        borderBottom: scrollY > 60 ? "1px solid rgba(0,0,0,0.05)" : "none",
        transition: "background 0.3s, border-color 0.3s",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 68,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "#0056D2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(0,86,210,0.5)" }}>
            <Cpu size={18} color="#fff" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em", color: "#1f2937" }}>
            SKILL<span style={{ color: "#0056D2" }}>TRACK</span>
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.1)", margin: "0 6px" }} />
          <button
            onClick={() => navigate("/login")}
            style={{ background: "none", border: "1px solid rgba(0,0,0,0.3)", color: "#1f2937", fontSize: 13, fontWeight: 600, padding: "8px 18px", borderRadius: 6, cursor: "pointer", transition: "background 0.2s, border-color 0.2s", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.3)"; }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/register")}
            style={{ background: '#0056D2', color: '#ffffff', border: "none", fontSize: 13, fontWeight: 700, padding: "8px 20px", borderRadius: 6, cursor: "pointer", transition: "background 0.2s, transform 0.15s", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#0043a8"; e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#0056D2"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            Start Free
          </button>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section ref={heroRef} style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* Background layers */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(0,86,210,0.15) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 80% 80%, rgba(59,130,246,0.08) 0%, transparent 50%)" }} />
        {/* Grid lines */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <Particles />
        {/* Bottom vignette */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200, background: "linear-gradient(transparent, #f5f7f8)" }} />

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 5%", maxWidth: 860, animation: "nf-fade-in 0.8s ease forwards" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,86,210,0.15)", border: "1px solid rgba(0,86,210,0.4)", borderRadius: 100, padding: "6px 16px", marginBottom: 28 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0056D2", animation: "nf-pulse-red 2s infinite" }} />
            <span style={{ color: "#ff6b6b", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em" }}>POWERED BY GEMINI AI</span>
          </div>

          <h1 style={{ fontSize: "clamp(40px, 7vw, 76px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 24 }}>
            Train Smarter.<br />
            <span className="nf-gradient-text">Master Your Skills.</span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "#4b5563", lineHeight: 1.6, marginBottom: 40, maxWidth: 620, margin: "0 auto 40px" }}>
            Immersive simulation-based training for computer science, cybersecurity, and DevOps. Get real AI feedback. Earn certifications. Stand out.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
            <button
              onClick={() => navigate("/register")}
              style={{ display: "flex", alignItems: "center", gap: 10, background: '#0056D2', color: '#ffffff', border: "none", borderRadius: 8, padding: "16px 36px", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.15s, box-shadow 0.15s", boxShadow: "0 4px 24px rgba(0,86,210,0.4)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,86,210,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,86,210,0.4)"; }}
            >
              <Play size={18} fill="currentColor" /> Get Started — It's Free
            </button>
            <button
              onClick={() => navigate("/login")}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.08)", color: "#1f2937", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "16px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(8px)", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.08)"}
            >
              Sign In <ChevronRight size={16} />
            </button>
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { icon: CheckCircle, text: "No credit card required" },
              { icon: CheckCircle, text: "Gemini AI feedback" },
              { icon: CheckCircle, text: "50+ simulations" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 7, color: "#4b5563", fontSize: 13 }}>
                <Icon size={15} style={{ color: "#22c55e" }} /> {text}
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── FEATURES ── */}
      <section style={{ padding: "60px 5% 80px", background: "rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ color: "#0056D2", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>WHY SKILLTRACK</p>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14 }}>
            Everything you need to excel
          </h2>
          <p style={{ color: "#4b5563", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
            Built for the next generation of tech professionals.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, maxWidth: 1100, margin: "0 auto" }}>
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="nf-card"
              style={{ padding: "28px 24px", animation: `nf-fade-in 0.5s ${i * 0.1}s ease both` }}
            >
              <div style={{ width: 44, height: 44, background: "rgba(0,86,210,0.12)", border: "1px solid rgba(0,86,210,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon size={20} style={{ color: "#0056D2" }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#1f2937" }}>{title}</h3>
              <p style={{ color: "#4b5563", fontSize: 13, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ padding: "80px 5%", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(0,86,210,0.1) 0%, transparent 70%)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 16 }}>
            Ready to level up?
          </h2>
          <p style={{ color: "#4b5563", fontSize: 16, marginBottom: 36, maxWidth: 440, margin: "0 auto 36px" }}>
            Join thousands of learners building real technical skills through simulation.
          </p>
          <button
            onClick={() => navigate("/register")}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: '#0056D2', color: '#ffffff', border: "none", borderRadius: 8, padding: "18px 44px", fontSize: 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 32px rgba(0,86,210,0.5)", transition: "transform 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <Play size={18} fill="currentColor" /> Create Free Account
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(0,0,0,0.05)", padding: "36px 5%", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "#0056D2", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Cpu size={14} color="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>
            SKILL<span style={{ color: "#0056D2" }}>TRACK</span>
          </span>
        </div>
        <p style={{ color: '#6b7280', fontSize: 12 }}>
          © 2026 SkillTrack · AI-powered professional simulation training
        </p>
        <div style={{ display: "flex", gap: 20 }}>
          {["Sign In", "Register", "About"].map(l => (
            <button
              key={l}
              onClick={() => { if (l === "Sign In") navigate("/login"); else if (l === "Register") navigate("/register"); }}
              style={{ background: "none", border: "none", color: '#6b7280', fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#fff"}
              onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}
            >{l}</button>
          ))}
        </div>
      </footer>
    </div>
  );
}
