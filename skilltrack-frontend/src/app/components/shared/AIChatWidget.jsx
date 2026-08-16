import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, X, Send, Sparkles, ChevronDown } from "lucide-react";
import { useAuth } from "../../../platform/engine/context/AuthContext";
import { askSkillTrackAssistant } from "../../../api/geminiApi";

const WELCOME_BY_ROLE = {
  learner: "Hi! 👋 I'm your SkillTrack AI Coach. Ask me anything about your simulations, scores, or learning path.",
  trainer: "Hi! 👋 I'm SkillTrack AI. I can help you review learner progress, suggest scenarios, or answer platform questions.",
  admin:   "Hi! 👋 I'm SkillTrack AI. I can help with platform insights, user management tips, or answer any questions.",
};

export function AIChatWidget() {
  const { user } = useAuth();
  const role = user?.role || "learner";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: WELCOME_BY_ROLE[role] || WELCOME_BY_ROLE.learner },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setUnread(0);
    }
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setThinking(true);
    try {
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const reply = await askSkillTrackAssistant({
        history,
        userMessage: text,
        userName: user?.name,
        userRole: role,
      });
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setThinking(false);
    }
  }

  const mdComponents = {
    p: ({ node, ...props }) => <p style={{ margin: "0 0 6px" }} {...props} />,
    strong: ({ node, ...props }) => <strong style={{ fontWeight: 700, color: "inherit" }} {...props} />,
    ul: ({ node, ...props }) => <ul style={{ paddingLeft: 16, margin: "0 0 6px" }} {...props} />,
    ol: ({ node, ...props }) => <ol style={{ paddingLeft: 16, margin: "0 0 6px" }} {...props} />,
    li: ({ node, ...props }) => <li style={{ marginBottom: 2 }} {...props} />,
  };

  return (
    <>
      {/* ── Floating Chat Panel ── */}
      {open && (
        <div
          style={{
            position: "fixed", bottom: 80, left: 16, zIndex: 9999,
            width: 320, height: 460,
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid rgba(99,102,241,0.25)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            display: "flex", flexDirection: "column",
            fontFamily: "Inter, sans-serif",
            overflow: "hidden",
            animation: "slideUpChat 0.2s ease",
          }}
        >
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={15} color="#fff" />
              </div>
              <div>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>SkillTrack AI</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80" }} />
                  <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, margin: 0 }}>Powered by Gemini</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8, background: "#f9fafb" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && (
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 6, marginTop: 2 }}>
                    <Bot size={11} color="#fff" />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "76%",
                    padding: "8px 12px",
                    borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                    background: m.role === "user" ? "linear-gradient(135deg, #3b82f6, #6366f1)" : "#ffffff",
                    color: m.role === "user" ? "#fff" : "#374151",
                    fontSize: 12,
                    lineHeight: 1.6,
                    border: m.role === "assistant" ? "1px solid rgba(0,0,0,0.07)" : "none",
                    boxShadow: m.role === "assistant" ? "0 1px 6px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown components={mdComponents}>{m.text}</ReactMarkdown>
                  ) : m.text}
                </div>
              </div>
            ))}

            {thinking && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bot size={11} color="#fff" />
                </div>
                <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: "14px 14px 14px 3px", padding: "10px 14px", display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a5b4fc", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#ffffff", display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask anything…"
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)",
                background: "rgba(0,0,0,0.04)", fontSize: 12, color: "#111827",
                outline: "none", fontFamily: "Inter, sans-serif",
              }}
            />
            <button
              onClick={handleSend}
              disabled={thinking || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
                background: thinking || !input.trim() ? "rgba(99,102,241,0.25)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              <Send size={14} color={thinking || !input.trim() ? "#a5b4fc" : "#fff"} />
            </button>
          </div>
        </div>
      )}

      {/* ── Sidebar Trigger Button ── */}
      <button
        onClick={() => { setOpen(o => !o); setUnread(0); }}
        title="AI Chat"
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: 6, marginBottom: 1,
          border: "none", cursor: "pointer", fontFamily: "inherit",
          fontSize: 13, fontWeight: open ? 700 : 500,
          background: open ? "linear-gradient(135deg, #6366f115, #8b5cf615)" : "transparent",
          color: open ? "#6366f1" : "#4b5563",
          borderLeft: `3px solid ${open ? "#6366f1" : "transparent"}`,
          transition: "all 0.15s ease",
          position: "relative",
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#1f2937"; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#4b5563"; } }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: open ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "linear-gradient(135deg, #6366f130, #8b5cf630)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={12} color={open ? "#fff" : "#6366f1"} />
          </div>
          {unread > 0 && (
            <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
              {unread}
            </div>
          )}
        </div>
        AI Chat
        {!open && (
          <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 600, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", padding: "2px 6px", borderRadius: 10 }}>
            <Sparkles size={8} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} />
            NEW
          </span>
        )}
      </button>

      {/* Bounce animation style */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideUpChat {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
