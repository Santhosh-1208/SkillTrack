import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

// Generic modal shell for all the "Add X" / "Edit X" forms in this app.
// Netflix dark themed version.
export function FormModal({ open, onOpenChange, title, description, children, maxWidth = "max-w-lg" }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${maxWidth} max-h-[85vh] overflow-y-auto`}
        style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", color: "#1f2937" }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "#1f2937" }}>{title}</DialogTitle>
          {description && <DialogDescription style={{ color: "#4b5563" }}>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function FieldLabel({ children }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      {children}
    </label>
  );
}

// Netflix-dark input classes
export const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors";

export const inputStyle = {
  background: "rgba(0,0,0,0.05)",
  border: "1px solid rgba(0,0,0,0.1)",
  color: "#1f2937",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  fontFamily: "Inter, sans-serif",
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

export const selectCls =
  "w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

export const textareaCls =
  "w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-[12px]";

export function FormActions({ onCancel, submitLabel = "Save", submitting = false, cancelLabel = "Cancel" }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
      <button
        type="button"
        onClick={onCancel}
        style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)", color: "#4b5563", cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.08)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={submitting}
        style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: submitting ? "rgba(0,86,210,0.5)" : "#0056D2", color: "#ffffff", border: "none", cursor: submitting ? "default" : "pointer", fontFamily: "inherit", transition: "transform 0.15s" }}
        onMouseEnter={e => { if (!submitting) e.currentTarget.style.transform = "scale(1.02)"; }}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        {submitting ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{children}</p>;
}
