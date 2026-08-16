// -----------------------------------------------------------------------------
// SCENARIOS API — REAL read and write
// -----------------------------------------------------------------------------
import { simulationsApi } from "./simulationsApi";
import { uid } from "../lib/localStore";
import { apiClient } from "../lib/apiClient";

export const REQUIRED_SCENARIO_FIELDS = [
  "simulation_id",
  "title",
  "branch",
  "level",
  "goal",
  "sop_steps",
  "decision_points",
  "possible_mistakes",
  "competencies",
  "competency_weights",
  "scoring",
];

export function validateScenarioJson(obj) {
  const errors = [];
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return ["The scenario must be a single JSON object (not an array or primitive)."];
  }
  if (!obj.competencies && obj.competency_weights) {
    obj.competencies = Object.keys(obj.competency_weights);
  } else if (!obj.competencies) {
    obj.competencies = ["Safety Awareness", "Procedure Compliance"];
  }
  if (!obj.competency_weights) {
    obj.competency_weights = { "Safety Awareness": 0.5, "Procedure Compliance": 0.5 };
  }
  if (!obj.decision_points) obj.decision_points = [];
  if (!obj.possible_mistakes) obj.possible_mistakes = [];

  for (const field of REQUIRED_SCENARIO_FIELDS) {
    if (!(field in obj)) errors.push(`Missing required field: "${field}"`);
  }
  if (obj.branch && !["All", "Electrical", "Mechanical", "IT/DevOps"].includes(obj.branch)) {
    errors.push(`"branch" must be one of All, Electrical, Mechanical, CSE`);
  }
  if (obj.level != null && (obj.level < 1 || obj.level > 4)) {
    errors.push(`"level" must be an integer between 1 and 4`);
  }
  if (obj.sop_steps && !Array.isArray(obj.sop_steps)) {
    errors.push(`"sop_steps" must be an array`);
  }
  if (obj.decision_points && !Array.isArray(obj.decision_points)) {
    errors.push(`"decision_points" must be an array`);
  }
  if (obj.possible_mistakes && !Array.isArray(obj.possible_mistakes)) {
    errors.push(`"possible_mistakes" must be an array`);
  }
  if (obj.scoring && (obj.scoring.base_score == null || obj.scoring.pass_threshold == null)) {
    errors.push(`"scoring" must include base_score and pass_threshold`);
  }
  return errors;
}

function toScenarioRow(sim, source, extra = {}) {
  return {
    simulation_id: sim.simulation_id,
    title: sim.title,
    branch: sim.branch,
    level: sim.level,
    goal: sim.goal,
    interaction_pattern: sim.interaction_pattern,
    time_limit_seconds: sim.time_limit_seconds,
    status: extra.status || "Active",
    source, // "backend" | "local"
    raw: sim,
  };
}

export const scenariosApi = {
  async list() {
    try {
      const backendSims = await simulationsApi.list();
      const rows = backendSims.map((s) => toScenarioRow(s, "backend"));
      return { rows, backendError: null };
    } catch (err) {
      return { rows: [], backendError: err.message };
    }
  },

  async create(scenarioJson) {
    const created = await apiClient.post("/api/simulations", scenarioJson);
    return toScenarioRow(created, "backend");
  },

  async update(simulationId, patch) {
    try {
      const updated = await apiClient.put(`/api/simulations/${encodeURIComponent(simulationId)}`, patch);
      return updated;
    } catch (err) {
      if (err.message && err.message.includes("404")) {
        // Not in backend yet. Let's fetch the local DSL version, merge, and POST it.
        const localFull = await simulationsApi.getOne(simulationId);
        if (localFull) {
          const fullMerged = { ...localFull, ...patch };
          const created = await apiClient.post("/api/simulations", fullMerged);
          return created;
        }
      }
      throw err;
    }
  },

  async remove(simulationId) {
    await apiClient.del(`/api/simulations/${encodeURIComponent(simulationId)}`);
    return true;
  },

  newDraftId: () => uid("SCENARIO"),
};
