// -----------------------------------------------------------------------------
// SIMULATIONS API — REAL, wired to spring-api's SimulationController
// -----------------------------------------------------------------------------
// GET /api/simulations           -> list summaries (dashboard / scenario list)
// GET /api/simulations/{id}      -> learner-safe detail (answer key stripped)
// -----------------------------------------------------------------------------

import { apiClient } from "../lib/apiClient";
import { SCENARIO_REGISTRY } from "../scenarios/index.js";

function mapDSLToBackendFormat(dsl) {
  let cat = "IT/DevOps";
  if (dsl.id.includes("cyber")) cat = "Cybersecurity";
  else if (dsl.id.includes("sql") || dsl.id.includes("linux") || dsl.id.includes("git")) cat = "IT/DevOps";
  else if (dsl.id.includes("elec")) cat = "Electrical";
  else if (dsl.id.includes("mech")) cat = "Mechanical";

  return {
    simulation_id: dsl.id,
    title: dsl.title,
    goal: dsl.description || "SimOS Mission",
    level: 2, // default medium
    branch: cat,
    interaction_pattern: "TERMINAL (SimOS)",
    isHidden: !!dsl.isHidden,
    learning_content: {
      what: dsl.description || "Learn how to accomplish this objective using terminal commands.",
      how: "Use the built-in SimOS terminal to interact with the environment. Follow the mission objectives."
    },
    sop_steps: (dsl.objectives || []).map((obj, i) => ({
      step_id: `step-${i}`,
      instruction: obj.description,
      hint: dsl.hints?.[i]?.message || "Follow standard procedures.",
      expected_action: "Type commands in terminal",
      is_safety_critical: false
    }))
  };
}

export const simulationsApi = {
  async list() {
    try {
      const backendSims = await apiClient.get("/api/simulations", { retry: true });
      const backendMap = new Map();
      backendSims.forEach(sim => backendMap.set(sim.simulation_id, sim));

      const dslSims = Object.values(SCENARIO_REGISTRY).map(mapDSLToBackendFormat);
      
      // Merge: prefer backend if it exists, otherwise use local DSL
      const merged = [];
      const seenIds = new Set();
      
      for (const sim of backendSims) {
        merged.push(sim);
        seenIds.add(sim.simulation_id);
      }
      
      for (const sim of dslSims) {
        if (!seenIds.has(sim.simulation_id) && !sim.isHidden) {
          merged.push(sim);
          seenIds.add(sim.simulation_id);
        }
      }
      merged.sort((a, b) => {
        if (a.simulation_id === "git-001") return -1;
        if (b.simulation_id === "git-001") return 1;
        return 0;
      });
      
      return merged;
    } catch (e) {
      // If backend fails, at least return the DSL ones
      const dslSims = Object.values(SCENARIO_REGISTRY).map(mapDSLToBackendFormat);
      if (dslSims.length > 0) return dslSims;
      throw e;
    }
  },
  async getOne(simulationId) {
    try {
      return await apiClient.get(`/api/simulations/${encodeURIComponent(simulationId)}`, { retry: true });
    } catch (err) {
      if (err.message && err.message.includes("404") && SCENARIO_REGISTRY[simulationId]) {
        return mapDSLToBackendFormat(SCENARIO_REGISTRY[simulationId]);
      }
      throw err;
    }
  },
};
