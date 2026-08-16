import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  Brain, Zap, FileText, AlertTriangle, Award, Bell, TrendingUp,
  Users, CheckCircle, Send, X, Sparkles, BookOpen, Calendar,
  ChevronDown, ChevronUp, Shield, PenLine
} from "lucide-react";
import { notificationsApi } from "../../api/notificationsApi";
import { simulationsApi } from "../../api/simulationsApi";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { askSkillTrackAssistant } from "../../api/geminiApi";

const ICON_MAP = {
  Brain, Zap, FileText, AlertTriangle, Award, Bell, TrendingUp,
  Users, CheckCircle, Sparkles, BookOpen, Shield, PenLine,
};

// ── Per-role tab config ──────────────────────────────────────────────────────
const TABS_BY_ROLE = {
  learner: [
    { id: "all",             label: "All",             icon: Bell },
    { id: "ai_recommendation", label: "AI Recommendations", icon: Brain },
    { id: "overall_feedback",  label: "Feedback",          icon: TrendingUp },
    { id: "assignment",        label: "Assignments",        icon: Zap },
  ],
  trainer: [
    { id: "all",           label: "All",              icon: Bell },
    { id: "learner_status", label: "Learner Status",   icon: Users },
    { id: "ai_summary",    label: "AI Summaries",     icon: Brain },
    { id: "assign",        label: "Assign Simulation", icon: Zap },
  ],
  admin: [
    { id: "all",             label: "All",             icon: Bell },
    { id: "trainer_action",  label: "Trainer Actions", icon: PenLine },
    { id: "platform_health", label: "Platform Health", icon: Shield },
    { id: "user_health",     label: "User Health",     icon: Users },
  ],
};

// ── Notification card ────────────────────────────────────────────────────────
function NotifCard({ n, onRead, onAcknowledge, userRole }) {
  const [expanded, setExpanded] = useState(false);
  const [acking, setAcking] = useState(false);
  const Icon = ICON_MAP[n.icon] || Bell;
  const isLong = (n.description || "").length > 120;
  const isTrainerAction = n.type === "trainer_action";
  const isAcknowledged = n.acknowledged;

  async function handleAcknowledge(e) {
    e.stopPropagation();
    if (acking || isAcknowledged) return;
    setAcking(true);
    try {
      await onAcknowledge(n.id);
    } finally {
      setAcking(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-4 transition-all cursor-pointer"
      style={{
        background: '#ffffff',
        border: n.read ? '1px solid rgba(0,0,0,0.06)' : `1px solid ${n.color || '#3b82f6'}40`,
        boxShadow: n.read ? 'none' : `0 2px 16px ${n.color || '#3b82f6'}18`,
        opacity: n.read && !isTrainerAction ? 0.7 : 1,
      }}
      onClick={() => { onRead(n.id, n.read); setExpanded(e => !e); }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: (n.color || "#3b82f6") + "18" }}>
          <Icon size={17} style={{ color: n.color || "#3b82f6" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold" style={{ color: '#111827' }}>{n.title}</p>
            <div className="flex items-center gap-2 shrink-0">
              {n.aiGenerated && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: '#6366f115', color: '#6366f1', border: '1px solid #6366f130' }}>
                  AI
                </span>
              )}
              {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
            </div>
          </div>
          <p className={`text-xs mt-0.5 transition-all ${expanded ? '' : 'line-clamp-2'}`}
            style={{ color: '#4b5563' }}>
            {n.description}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px]" style={{ color: '#9ca3af' }}>
              {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : (n.time || '')}
            </p>
            {isLong && (
              <button className="text-[10px] text-blue-500 flex items-center gap-0.5 hover:underline" onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}>
                {expanded ? <><ChevronUp size={10} /> Less</> : <><ChevronDown size={10} /> More</>}
              </button>
            )}
          </div>
          {/* Assignment action */}
          {n.category === "assignment" && n.simulationTitle && (
            <div className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2"
              style={{ background: '#fef9c3', border: '1px solid #fde047' }}>
              <Zap size={12} style={{ color: '#ca8a04' }} />
              <span className="text-xs font-semibold" style={{ color: '#854d0e' }}>
                Assigned: {n.simulationTitle}
              </span>
            </div>
          )}
          {/* Trainer action — Acknowledge button (admin only) */}
          {isTrainerAction && userRole === "admin" && (
            <div className="mt-3" onClick={e => e.stopPropagation()}>
              {isAcknowledged ? (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                  <CheckCircle size={13} /> Acknowledged
                </div>
              ) : (
                <button
                  onClick={handleAcknowledge}
                  disabled={acking}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
                >
                  <CheckCircle size={13} />
                  {acking ? "Acknowledging…" : "Acknowledge"}
                </button>
              )}
            </div>
          )}
          {/* Admin acknowledgement received — shown to trainers */}
          {n.type === "admin_acknowledgement" && (
            <div className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
              <CheckCircle size={13} /> Admin has reviewed your change
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AI-Generated quick summary chip ─────────────────────────────────────────
function AISummaryBanner({ role, notifs }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const unread = notifs.filter(n => !n.read).length;
  const categories = [...new Set(notifs.map(n => n.category))];

  async function generate() {
    setLoading(true);
    const context = notifs.slice(0, 5).map(n => `- ${n.title}: ${n.description?.slice(0, 80)}`).join("\n");
    const msg = `I have ${notifs.length} notifications (${unread} unread). Here's a summary:\n${context}\n\nGive me a 2-sentence overall insight in your role as SkillTrack AI.`;
    const result = await askSkillTrackAssistant({ userMessage: msg, userRole: role });
    setSummary(result);
    setLoading(false);
  }

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, #6366f108, #8b5cf608)', border: '1px solid #6366f120' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain size={15} style={{ color: '#6366f1' }} />
          <span className="text-sm font-bold" style={{ color: '#4c1d95' }}>AI Notification Summary</span>
        </div>
        {!summary && (
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
            style={{ background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Sparkles size={11} />
            {loading ? "Generating…" : "Summarise"}
          </button>
        )}
      </div>
      {summary ? (
        <div className="text-xs" style={{ color: '#4b5563', lineHeight: 1.7 }}>
          <ReactMarkdown components={{ p: ({node, ...props}) => <p className="mb-1" {...props} />, strong: ({node, ...props}) => <strong className="font-semibold text-gray-800" {...props} /> }}>
            {summary}
          </ReactMarkdown>
          <button onClick={() => setSummary(null)} className="mt-1 text-[10px] text-indigo-500 hover:underline">Regenerate</button>
        </div>
      ) : (
        <p className="text-xs" style={{ color: '#6b7280' }}>
          {unread} unread across {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}. Click Summarise for an AI digest.
        </p>
      )}
    </div>
  );
}

// ── Trainer: Assign Simulation Panel ────────────────────────────────────────
function AssignSimulationPanel({ user }) {
  const [simulations, setSimulations] = useState([]);
  const [selectedSim, setSelectedSim] = useState("");
  const [learnerIds, setLearnerIds] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    simulationsApi.list().then(setSimulations).catch(() => {});
  }, []);

  async function handleAssign() {
    if (!selectedSim || !learnerIds.trim()) return;
    setSending(true);
    const sim = simulations.find(s => s.simulation_id === selectedSim);
    const ids = learnerIds.split(",").map(s => s.trim()).filter(Boolean);
    notificationsApi.createAssignment({
      trainerId: user.id,
      trainerName: user.name,
      learnerIds: ids,
      simulationId: selectedSim,
      simulationTitle: sim?.title || selectedSim,
      dueDate,
      message,
    });
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); setSelectedSim(""); setLearnerIds(""); setDueDate(""); setMessage(""); }, 3000);
  }

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.12)", background: "#ffffff",
    fontSize: 13, color: "#111827", outline: "none",
    fontFamily: "Inter, sans-serif", boxSizing: "border-box",
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
          <Zap size={15} style={{ color: '#d97706' }} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: '#111827' }}>Assign a Simulation to Learner(s)</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Simulation</label>
          <select value={selectedSim} onChange={e => setSelectedSim(e.target.value)} style={inputStyle}>
            <option value="">Select a simulation…</option>
            {simulations.map(s => (
              <option key={s.simulation_id} value={s.simulation_id}>{s.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Learner User IDs <span className="font-normal text-gray-400">(comma-separated)</span></label>
          <input
            value={learnerIds}
            onChange={e => setLearnerIds(e.target.value)}
            placeholder="learner-1, learner-2, …"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Due Date <span className="font-normal text-gray-400">(optional)</span></label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Message to Learner <span className="font-normal text-gray-400">(optional)</span></label>
          <textarea
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Add a personal note or instructions…"
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        <button
          onClick={handleAssign}
          disabled={sending || !selectedSim || !learnerIds.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
          style={{ background: sent ? '#22c55e' : (sending || !selectedSim || !learnerIds.trim()) ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
        >
          <Send size={14} />
          {sent ? "✓ Assignment Sent!" : sending ? "Sending…" : "Send Assignment"}
        </button>
      </div>
    </div>
  );
}

// ── Main NotificationsPage ───────────────────────────────────────────────────
export function NotificationsPage({ onNavigate }) {
  const { user } = useAuth();
  const role = user?.role || "learner";
  const tabs = TABS_BY_ROLE[role] || TABS_BY_ROLE.learner;

  const [activeTab, setActiveTab] = useState("all");
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    notificationsApi.listForUser(user.id, role)
      .then(data => { setNotifs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return notifs;
    // Support both category and type fields
    return notifs.filter(n => n.category === activeTab || n.type === activeTab);
  }, [notifs, activeTab]);

  const unreadCount = notifs.filter(n => !n.read).length;

  function handleRead(id, isRead) {
    if (isRead) return;
    notificationsApi.markAsRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  function handleMarkAllRead() {
    notificationsApi.markAllAsRead(user.id);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function handleAcknowledge(notifId) {
    await notificationsApi.acknowledge(notifId, user?.name || "Admin");
    setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, acknowledged: true, read: true } : n));
  }

  // Role-specific descriptors
  const ROLE_LABELS = {
    learner: { title: "Notifications", subtitle: "AI recommendations, feedback & assignments" },
    trainer: { title: "Notifications", subtitle: "Learner status reports, AI insights & simulation assignments" },
    admin:   { title: "Notifications", subtitle: "Platform health, user activity & AI alerts" },
  };
  const { title, subtitle } = ROLE_LABELS[role] || ROLE_LABELS.learner;

  return (
    <div className="p-6 max-w-2xl" style={{ background: '#f5f7f8', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{title}</h1>
          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{subtitle}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-xs text-blue-500 hover:underline font-semibold mt-1">
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {tabs.map(tab => {
          // Don't show the "Assign Simulation" tab in the filter — it's a panel below
          if (role === "trainer" && tab.id === "assign") return null;
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          const count = tab.id === "all" ? notifs.filter(n => !n.read).length : notifs.filter(n => (n.category === tab.id || n.type === tab.id) && !n.read).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background: isActive ? '#111827' : '#ffffff',
                color: isActive ? '#ffffff' : '#4b5563',
                border: isActive ? 'none' : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <TabIcon size={12} />
              {tab.label}
              {count > 0 && (
                <span className="rounded-full text-[9px] font-bold px-1.5 py-0.5"
                  style={{ background: isActive ? '#ffffff30' : '#3b82f6', color: isActive ? '#fff' : '#fff', minWidth: 16, textAlign: 'center' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* AI Summary Banner */}
      {notifs.length > 0 && <AISummaryBanner role={role} notifs={notifs} />}

      {/* Trainer: Assign Simulation panel */}
      {role === "trainer" && (
        <div className="mb-5">
          <AssignSimulationPanel user={user} />
        </div>
      )}

      {/* Notification list */}
      {loading ? (
        <div className="text-sm" style={{ color: '#6b7280' }}>Loading notifications…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <Bell size={28} className="mx-auto mb-3" style={{ color: '#d1d5db' }} />
          <p className="text-sm font-medium" style={{ color: '#6b7280' }}>
            {activeTab === "all" ? "No notifications yet." : `No ${tabs.find(t => t.id === activeTab)?.label || ""} notifications.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(n => (
            <NotifCard key={n.id} n={n} onRead={handleRead} onAcknowledge={handleAcknowledge} userRole={role} />
          ))}
        </div>
      )}
    </div>
  );
}
