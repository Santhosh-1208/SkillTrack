import { useEffect, useState } from "react";
import { Play, Zap } from "lucide-react";
import { simulationsApi } from "../../api/simulationsApi";
import { Badge, BackendErrorNotice } from "../components/shared/atoms";
import { SCENARIO_REGISTRY } from "../../scenarios/index.js";

const CATEGORIES = [
  { label: "All Categories", value: "All" },
  { label: "IT / DevOps", value: "IT/DevOps" },
  { label: "Electrical", value: "Electrical" },
  { label: "Mechanical", value: "Mechanical" },
  { label: "Cybersecurity", value: "Cybersecurity" },
];

function levelBadge(level) {
  if (level <= 1) return { label: "Easy", color: "green" };
  if (level === 2) return { label: "Medium", color: "orange" };
  return { label: "Hard", color: "red" };
}

/**
 * Returns true if the simulation should show for the selected category.
 */
function matchesCategory(simCategory, selectedCategory) {
  if (selectedCategory === "All") return true;
  if (!simCategory) return false;
  // Remove the "All" check that was causing everything to appear everywhere if they had "All"
  const tags = String(simCategory).split("/").map((t) => t.trim().toLowerCase());
  const selected = selectedCategory.toLowerCase();
  return tags.some((tag) => tag === selected || String(simCategory).toLowerCase() === selected);
}

export function SimulationsListPage({ onNavigate }) {
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    simulationsApi
      .list()
      .then(setSimulations)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-5 text-sm" style={{ color: '#4b5563' }}>Loading simulations…</div>;
  }

  const filteredSimulations = simulations.filter((sim) => {
    // Hide drafts and pending approvals from learners
    if (sim.status && sim.status !== "Active") return false;
    return matchesCategory(sim.category || sim.branch, selectedCategory);
  });

  return (
    <div className="p-5 space-y-4" style={{ background: '#f5f7f8', minHeight: '100vh' }}>
      {/* Header + Branch filter */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Simulations</h1>
          <p className="text-sm" style={{ color: '#4b5563' }}>Choose a scenario to start a new attempt.</p>
        </div>
        <select
          id="category-filter"
          className="rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', color: '#111827' }}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {CATEGORIES.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <BackendErrorNotice>
          {error} Start the Spring Boot API on port 8080 to load simulations.
        </BackendErrorNotice>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSimulations.map((sim) => {
          const diff = levelBadge(sim.level);
          return (
            <div key={sim.simulation_id} className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
                    <Zap size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: '#111827' }}>{sim.title}</h2>
                     <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{sim.simulation_id}</p>
                  </div>
                </div>
                <Badge color={diff.color}>{diff.label}</Badge>
              </div>
              <p className="text-xs mb-3 line-clamp-2" style={{ color: '#4b5563' }}>{sim.goal}</p>
              <div className="flex items-center gap-2 mb-4">
                <Badge color="blue">{sim.category || sim.branch}</Badge>
                {sim.interaction_pattern && <Badge color="gray">{sim.interaction_pattern}</Badge>}
              </div>
              <button
                onClick={() => onNavigate("simulation-detail", { id: sim.simulation_id })}
                className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Play size={14} /> Start
              </button>
            </div>
          );
        })}
      </div>

      {!filteredSimulations.length && !error && (
        <div className="rounded-xl p-8 text-center text-sm" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', color: '#4b5563' }}>
          {simulations.length > 0
            ? `No simulations found for "${selectedCategory}" category.`
            : "No simulations found. Seed the backend configs and restart Spring Boot."}
        </div>
      )}
    </div>
  );
}
