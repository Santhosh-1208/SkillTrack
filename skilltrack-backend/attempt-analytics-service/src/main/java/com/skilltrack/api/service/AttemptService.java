package com.skilltrack.api.service;

import com.skilltrack.api.dto.ActionRequest;
import com.skilltrack.api.dto.DecisionRequest;
import com.skilltrack.api.dto.HintRequest;
import com.skilltrack.api.dto.StartAttemptRequest;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Owns the full lifecycle of an attempt document in the "attempts" collection:
 * start -> log actions/decisions/hints as they happen -> complete (hands the
 * attempt + matching simulation config to the AI scoring service, then persists
 * whatever comes back).
 *
 * Every method here is generic across all 4 simulations - nothing in this class
 * knows about PPE vs CNC vs anything else. That's entirely config data.
 */
@Service
public class AttemptService {

    private static final String COLLECTION = "attempts";
    private static final String SIMULATION_SERVICE_URL = "http://simulation-service/api/simulations/";

    private final MongoTemplate mongoTemplate;
    private final RestTemplate restTemplate;
    private final ScoringClient scoringClient;

    public AttemptService(MongoTemplate mongoTemplate,
                           RestTemplate restTemplate,
                           ScoringClient scoringClient) {
        this.mongoTemplate = mongoTemplate;
        this.restTemplate = restTemplate;
        this.scoringClient = scoringClient;
    }

    private Document getSimulationConfig(String simulationId) {
        try {
            return restTemplate.getForObject(SIMULATION_SERVICE_URL + simulationId, Document.class);
        } catch (Exception e) {
            // If missing (e.g. frontend DSL simulation), return a dummy config
            Document dummy = new Document();
            dummy.put("simulation_id", simulationId);
            dummy.put("title", "Frontend Simulation: " + simulationId);
            Document scoring = new Document();
            scoring.put("max_score", 100);
            dummy.put("scoring", scoring);
            return dummy;
        }
    }

    public Document start(StartAttemptRequest req) {
        // Check for an existing attempt for this learner + simulation pair
        Query existingQuery = Query.query(Criteria.where("learner_id").is(req.getLearnerId())
                .and("simulation_id").is(req.getSimulationId()));

        List<Document> existing = mongoTemplate.find(existingQuery, Document.class, COLLECTION);

        // If there's an in_progress attempt, resume it rather than creating a duplicate
        for (Document a : existing) {
            if ("in_progress".equals(a.getString("status"))) {
                a.remove("_id");
                return a;
            }
        }

        // Fail fast with a clear error if the simulation_id doesn't exist, rather
        // than silently creating an attempt against nothing.
        getSimulationConfig(req.getSimulationId());

        Document attempt = new Document();
        attempt.put("attempt_id", UUID.randomUUID().toString());
        attempt.put("simulation_id", req.getSimulationId());
        attempt.put("learner_id", req.getLearnerId());
        attempt.put("started_at", Instant.now().toString());
        attempt.put("ended_at", null);
        attempt.put("status", "in_progress");
        attempt.put("actions", new ArrayList<Document>());
        attempt.put("decisions_made", new ArrayList<Document>());
        attempt.put("hints_used", new ArrayList<String>());
        attempt.put("mistakes_made", new ArrayList<Document>());
        attempt.put("total_time_seconds", null);
        attempt.put("final_score", null);

        mongoTemplate.insert(attempt, COLLECTION);
        attempt.remove("_id");
        return attempt;
    }

    public Document addAction(String attemptId, ActionRequest req) {
        Document action = new Document();
        action.put("action_id", UUID.randomUUID().toString());
        action.put("step_id", req.getStepId());
        action.put("timestamp", Instant.now().toString());
        action.put("action_type", req.getActionType());

        Query query = attemptQuery(attemptId, true);
        Update update = new Update().push("actions", action);
        mongoTemplate.updateFirst(query, update, COLLECTION);

        return getOrThrow(attemptId);
    }

    public Document addDecision(String attemptId, DecisionRequest req) {
        Document decision = new Document();
        decision.put("decision_id", req.getDecisionId());
        decision.put("option_id_chosen", req.getOptionIdChosen());
        decision.put("timestamp", Instant.now().toString());
        decision.put("time_taken_seconds", req.getTimeTakenSeconds());

        Query query = attemptQuery(attemptId, true);
        Update update = new Update().push("decisions_made", decision);
        mongoTemplate.updateFirst(query, update, COLLECTION);

        return getOrThrow(attemptId);
    }

    public Document addHint(String attemptId, HintRequest req) {
        Query query = attemptQuery(attemptId, true);
        Update update = new Update().push("hints_used", req.getHintId());
        mongoTemplate.updateFirst(query, update, COLLECTION);

        return getOrThrow(attemptId);
    }

    public Document complete(String attemptId, Map<String, Object> overrides) {
        Document attempt = getOrThrow(attemptId);

        if ("completed".equals(attempt.getString("status"))) {
            return attempt;
        }

        Instant startedAt = Instant.parse(attempt.getString("started_at"));
        Instant endedAt = Instant.now();
        double totalSeconds = Duration.between(startedAt, endedAt).toMillis() / 1000.0;

        attempt.put("ended_at", endedAt.toString());
        attempt.put("status", "completed");
        
        Object sessionDurationRaw = overrides.get("session_duration_seconds");
        if (sessionDurationRaw != null) {
            try {
                totalSeconds = Double.parseDouble(sessionDurationRaw.toString());
            } catch (Exception ignored) {}
        }
        
        attempt.put("total_time_seconds", totalSeconds);

        Document simulationConfig = getSimulationConfig(attempt.getString("simulation_id"));

        // Extract overrides sent by the frontend
        Object scoreOverrideRaw    = overrides.get("score_override");
        Object hintsUsedCountRaw   = overrides.get("hints_used_count");
        Object aiHelpCountRaw      = overrides.get("ai_help_count");
        Object regularHintCountRaw = overrides.get("regular_hint_count");
        Object hintPenaltyRaw      = overrides.get("hint_penalty");

        int    hintsUsedCount   = hintsUsedCountRaw   instanceof Number n ? n.intValue()   : 0;
        int    aiHelpCount      = aiHelpCountRaw      instanceof Number n ? n.intValue()   : 0;
        int    regularHintCount = regularHintCountRaw instanceof Number n ? n.intValue()   : 0;
        double hintPenalty      = hintPenaltyRaw      instanceof Number n ? n.doubleValue(): (regularHintCount * 5.0 + aiHelpCount * 10.0);

        boolean hasOverride = scoreOverrideRaw instanceof Number;
        double finalOverrideScore = hasOverride ? ((Number) scoreOverrideRaw).doubleValue() : -1.0;
        // The frontend engine's score already has hints deducted. Reverse-engineer the base score:
        double baseOverrideScore  = hasOverride ? (finalOverrideScore + hintPenalty) : 100.0;

        // Attempt AI scoring — fall back to a default score if the AI service is
        // unavailable, rate-limited, or returns an unexpected error.
        Object mistakesMade;
        Object finalScore;
        boolean usedFallback = false;
        try {
            Map<String, Object> scoringResult = scoringClient.scoreAttempt(simulationConfig, attempt);
            mistakesMade = scoringResult.get("mistakes_made");
            finalScore   = scoringResult.get("final_score");
        } catch (Exception scoringEx) {
            org.slf4j.LoggerFactory.getLogger(AttemptService.class)
                .warn("AI scoring failed, using fallback score. Reason: {}", scoringEx.getMessage());

            usedFallback = true;
            mistakesMade = new ArrayList<>();
            Document fallback = new Document();
            
            // Calculate penalty for skipped steps
            double skipPenalty = 0.0;
            int skippedCount = 0;
            java.util.List<Document> actions = attempt.getList("actions", Document.class);
            if (actions != null) {
                for (Document a : actions) {
                    if ("step_skipped".equals(a.getString("action_type"))) {
                        skippedCount++;
                    }
                }
            }
            java.util.List<Document> sopSteps = simulationConfig.getList("sop_steps", Document.class);
            if (sopSteps != null && !sopSteps.isEmpty()) {
                skipPenalty = (100.0 / sopSteps.size()) * skippedCount;
            }

            // If the frontend gave us a score, it's already penalised. If not, start at 100.
            double penalisedScore = hasOverride ? finalOverrideScore : Math.max(0.0, 100.0 - hintPenalty - skipPenalty);
            
            fallback.put("overall_score",  penalisedScore);
            fallback.put("passed",         penalisedScore >= 60.0);
            fallback.put("pass_threshold", 60.0);
            fallback.put("base_score",     hasOverride ? baseOverrideScore : 100.0);
            fallback.put("total_penalty",  hintPenalty);
            fallback.put("hints_used_count",   hintsUsedCount);
            fallback.put("ai_help_count",      aiHelpCount);
            fallback.put("regular_hint_count", regularHintCount);
            fallback.put("hint_penalty",       hintPenalty);
            fallback.put("competency_scores", new Document());
            fallback.put("ai_explanations",   java.util.List.of(
                "AI scoring service was temporarily unavailable. This is a default score.",
                (hintsUsedCount > 0 || skippedCount > 0)
                    ? String.format("You used %d hint(s), %d AI help(s), and skipped %d step(s). Applied penalty: %.0f pts.",
                                    regularHintCount, aiHelpCount, skippedCount, (hintPenalty + skipPenalty))
                    : "No hints were used and no steps were skipped.",
                "Please retry the simulation for a personalised AI assessment."
            ));
            fallback.put("recommended_next_simulations", new ArrayList<>());
            finalScore = fallback;
        }

        // Apply overrides on top of whatever the AI returned
        if (finalScore instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> fs = (Map<String, Object>) finalScore;
            // 1. Inject hint counts into the final score document
            if (hintsUsedCount > 0) {
                fs.put("hints_used_count",   hintsUsedCount);
                fs.put("ai_help_count",      aiHelpCount);
                fs.put("regular_hint_count", regularHintCount);
                fs.put("hint_penalty",       hintPenalty);
            }

            // 2. Override the score.
            // If hasOverride is true, use the exact frontend score (which is already penalised).
            // If false, but we got an AI score, we must deduct hintPenalty from the AI's score
            // (since the AI doesn't deduct hint penalties itself).
            if (hasOverride) {
                fs.put("overall_score", finalOverrideScore);
                fs.put("base_score",    baseOverrideScore);
                fs.put("total_penalty", hintPenalty); // Override AI's total penalty completely
                double threshold = fs.get("pass_threshold") instanceof Number pt ? pt.doubleValue() : 60.0;
                fs.put("passed", finalOverrideScore >= threshold);
            } else if (!usedFallback && hintsUsedCount > 0) {
                Object existingScore = fs.get("overall_score");
                if (existingScore instanceof Number existing) {
                    double aiScore = existing.doubleValue();
                    double penalised = Math.max(0.0, aiScore - hintPenalty);
                    fs.put("overall_score", penalised);
                    fs.put("total_penalty", hintPenalty + (fs.get("total_penalty") instanceof Number tp ? tp.doubleValue() : 0.0));
                    double threshold = fs.get("pass_threshold") instanceof Number pt ? pt.doubleValue() : 60.0;
                    fs.put("passed", penalised >= threshold);
                }
            }
        }

        Query query = attemptQuery(attemptId, false);
        Update update = new Update()
                .set("ended_at", attempt.get("ended_at"))
                .set("status", "completed")
                .set("total_time_seconds", totalSeconds)
                .set("mistakes_made", mistakesMade != null ? mistakesMade : new ArrayList<>())
                .set("final_score", finalScore);
        mongoTemplate.updateFirst(query, update, COLLECTION);

        return getOrThrow(attemptId);
    }

    public Document getOrThrow(String attemptId) {
        Document attempt = mongoTemplate.findOne(attemptQuery(attemptId, false), Document.class, COLLECTION);
        if (attempt == null) {
            throw new NoSuchElementException("No attempt found with attempt_id=" + attemptId);
        }
        attempt.remove("_id");
        return attempt;
    }

    public List<Document> listForLearner(String learnerId) {
        Query query = Query.query(Criteria.where("learner_id").is(learnerId));
        List<Document> attempts = mongoTemplate.find(query, Document.class, COLLECTION);
        attempts.forEach(a -> a.remove("_id"));
        return attempts;
    }

    public void delete(String attemptId) {
        mongoTemplate.remove(attemptQuery(attemptId, false), COLLECTION);
    }

    private Query attemptQuery(String attemptId, boolean requireInProgress) {
        Criteria criteria = Criteria.where("attempt_id").is(attemptId);
        if (requireInProgress) {
            criteria = criteria.and("status").is("in_progress");
        }
        return Query.query(criteria);
    }
}
