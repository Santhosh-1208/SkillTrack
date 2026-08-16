import { useEffect, useState } from "react";
import { Award, Download, CheckCircle } from "lucide-react";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { attemptsApi } from "../../api/attemptsApi";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function CertificatesPage({ onNavigate }) {
  const { user } = useAuth();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attemptsApi
      .listForLearner(user?.id)
      .then((attempts) => {
        // Only completed + passed attempts become certificates
        const passed = attempts.filter(
          (a) =>
            a.status === "completed" &&
            a.final_score?.passed === true
        );
        // Deduplicate: one certificate per simulation (best score)
        const best = {};
        for (const a of passed) {
          const sid = a.simulation_id;
          if (!best[sid] || a.final_score.overall_score > best[sid].final_score.overall_score) {
            best[sid] = a;
          }
        }
        setCerts(Object.values(best));
      })
      .catch(() => setCerts([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) {
    return <div className="p-5 text-sm" style={{ color: '#4b5563' }}>Loading certificates…</div>;
  }

  return (
    <div className="p-5 space-y-4" style={{ background: '#f5f7f8', minHeight: '100%' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Certificates</h1>
          <p className="text-sm" style={{ color: '#4b5563' }}>Earned by passing simulations</p>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
          {certs.length} earned
        </span>
      </div>

      {certs.length === 0 && (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <Award size={40} className="mx-auto mb-3" style={{ color: '#6b7280' }} />
          <p className="text-sm font-semibold" style={{ color: '#4b5563' }}>No certificates yet</p>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Complete and pass a simulation to earn your first certificate.</p>
          <button
            onClick={() => onNavigate("simulation")}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl transition-colors"
            style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: '#111827' }}
          >
            Browse Simulations
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {certs.map((cert) => (
          <div
            key={cert.attempt_id}
            className="rounded-2xl overflow-hidden"
            style={{ background: '#ffffff', border: '1px solid rgba(212,175,55,0.25)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
          >
            {/* Certificate header bar */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3 flex items-center gap-3">
              <Award size={22} className="text-white/80" />
              <div>
                <p className="text-white font-bold text-sm">{cert.simulation_id?.replace(/_/g, " ")}</p>
                <p className="text-blue-200 text-[11px]">Certificate of Completion</p>
              </div>
            </div>

            {/* Certificate body */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(212,175,55,0.12)' }}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-xs font-semibold" style={{ color: '#111827' }}>Passed</span>
                </div>
                <p className="text-xs" style={{ color: '#4b5563' }}>
                  Score:{" "}
                  <span className="font-bold" style={{ color: '#111827' }}>
                    {Math.round(cert.final_score?.overall_score ?? 0)}%
                  </span>
                </p>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  Completed {formatDate(cert.completed_at || cert.started_at)}
                </p>
              </div>
              <div className="text-right space-y-2">
                <p className="text-2xl font-extrabold" style={{ color: '#D4AF37' }}>
                  {Math.round(cert.final_score?.overall_score ?? 0)}%
                </p>
                <button
                  onClick={() =>
                    onNavigate("ai-feedback", { attemptId: cert.attempt_id })
                  }
                  className="flex items-center gap-1 text-[11px] font-semibold"
                  style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: '#4b5563', borderRadius: '6px', padding: '3px 8px' }}
                >
                  <Download size={12} /> View Report
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
