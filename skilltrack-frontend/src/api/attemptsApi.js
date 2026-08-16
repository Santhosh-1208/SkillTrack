// -----------------------------------------------------------------------------
// ATTEMPTS API — REAL Backend Persistence
// -----------------------------------------------------------------------------

import { apiClient } from "../lib/apiClient";

export const attemptsApi = {
  async start({ simulationId, learnerId }) {
    return await apiClient.post("/api/attempts/start", { simulationId, learnerId });
  },

  async logAction(attemptId, { stepId, actionType }) {
    return await apiClient.post(`/api/attempts/${attemptId}/actions`, { stepId, actionType });
  },

  async logDecision(attemptId, { decisionId, optionIdChosen, timeTakenSeconds }) {
    return await apiClient.post(`/api/attempts/${attemptId}/decisions`, { decisionId, optionIdChosen, timeTakenSeconds });
  },

  async logHint(attemptId, { hintId }) {
    return await apiClient.post(`/api/attempts/${attemptId}/hints`, { hintId });
  },

  async complete(attemptId, scoreOverride = null, hintsUsed = [], sessionDurationSeconds = null) {
    // Normalise hintsUsed: accept either a count (number) or an array of hint type strings
    const hintsArray = Array.isArray(hintsUsed) ? hintsUsed : [];
    const hintCount  = typeof hintsUsed === 'number' ? hintsUsed : hintsArray.length;
    const aiHelpCount = hintsArray.filter(h => h === 'ai_help').length;
    const regularHintCount = hintsArray.filter(h => h === 'hint').length;

    // Build body — backend uses these to override/augment the AI scoring result
    const body = {};
    if (scoreOverride !== null && scoreOverride !== undefined) body.score_override = scoreOverride;
    if (hintCount > 0) {
      body.hints_used_count   = hintCount;
      body.ai_help_count      = aiHelpCount;
      body.regular_hint_count = regularHintCount;
      body.hint_penalty       = regularHintCount * 5 + aiHelpCount * 10;
    }
    if (sessionDurationSeconds !== null) {
      body.session_duration_seconds = sessionDurationSeconds;
    }

    const remote = await apiClient.post(`/api/attempts/${attemptId}/complete`, body);

    // Patch the returned object so the feedback page sees updated data immediately
    if (scoreOverride !== null && scoreOverride !== undefined) remote.score = scoreOverride;
    if (hintCount > 0) {
      remote.hints_used_detail = { total: hintCount, hints: regularHintCount, ai_help: aiHelpCount };
      // Ensure final_score reflects correct hint count if backend used fallback
      if (remote.final_score) {
        remote.final_score.hints_used_count   = hintCount;
        remote.final_score.ai_help_count      = aiHelpCount;
        remote.final_score.regular_hint_count = regularHintCount;
        const hintPenalty = regularHintCount * 5 + aiHelpCount * 10;
        remote.final_score.hint_penalty = hintPenalty;
        if (scoreOverride !== null && scoreOverride !== undefined) {
          remote.final_score.overall_score = scoreOverride;
          remote.final_score.passed = scoreOverride >= (remote.final_score.pass_threshold ?? 60);
        }
      }
    }
    return remote;
  },

  async getOne(attemptId) {
    return await apiClient.get(`/api/attempts/${attemptId}`, { retry: true });
  },

  async listForLearner(learnerId) {
    return await apiClient.get(`/api/attempts?learnerId=${encodeURIComponent(learnerId)}`, { retry: true });
  },

  async remove(attemptId) {
    return await apiClient.del(`/api/attempts/${encodeURIComponent(attemptId)}`);
  },

  listByLearner(learnerId) {
    return this.listForLearner(learnerId);
  },
};
