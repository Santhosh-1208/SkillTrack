import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle, error: AlertTriangle, info: Info };
const COLORS = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "info") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider
      value={{
        success: (m) => push(m, "success"),
        error: (m) => push(m, "error"),
        info: (m) => push(m, "info"),
      }}
    >
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 w-80">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-2 border rounded-xl px-3.5 py-3 shadow-lg text-xs font-medium ${COLORS[t.type]}`}
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              <Icon size={15} className="shrink-0 mt-0.5" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
