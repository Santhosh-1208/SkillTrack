package com.skilltrack.api.controller;

import com.skilltrack.api.dto.ActionRequest;
import com.skilltrack.api.dto.DecisionRequest;
import com.skilltrack.api.dto.HintRequest;
import com.skilltrack.api.dto.StartAttemptRequest;
import com.skilltrack.api.service.AttemptService;
import jakarta.validation.Valid;
import org.bson.Document;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attempts")
public class AttemptController {

    private final AttemptService attemptService;

    public AttemptController(AttemptService attemptService) {
        this.attemptService = attemptService;
    }

    /** Called when the learner opens a simulation and clicks "Start". */
    @PostMapping("/start")
    public Document start(@Valid @RequestBody StartAttemptRequest req) {
        return attemptService.start(req);
    }

    /** Called after every completed SOP step (or skipped/wrong step) during the run. */
    @PostMapping("/{attemptId}/actions")
    public Document logAction(@PathVariable String attemptId, @Valid @RequestBody ActionRequest req) {
        return attemptService.addAction(attemptId, req);
    }

    /** Called whenever the learner picks an option at a decision point. */
    @PostMapping("/{attemptId}/decisions")
    public Document logDecision(@PathVariable String attemptId, @Valid @RequestBody DecisionRequest req) {
        return attemptService.addDecision(attemptId, req);
    }

    /** Called when the learner taps "Show hint" on a step. */
    @PostMapping("/{attemptId}/hints")
    public Document logHint(@PathVariable String attemptId, @Valid @RequestBody HintRequest req) {
        return attemptService.addHint(attemptId, req);
    }

    /**
     * Called when the learner finishes (or the simulation ends). This is what
     * triggers scoring: the attempt + its simulation config get sent to the
     * Python AI service, and the result (score, mistakes, competencies,
     * recommendations) is stored on the attempt and returned here for the
     * AI Feedback page to render immediately.
     */
    @PostMapping("/{attemptId}/complete")
    public Document complete(@PathVariable String attemptId,
                             @RequestBody(required = false) Map<String, Object> overrides) {
        return attemptService.complete(attemptId, overrides != null ? overrides : Map.of());
    }

    /** Fetch a single attempt (e.g. re-opening the AI Feedback page later). */
    @GetMapping("/{attemptId}")
    public Document getOne(@PathVariable String attemptId) {
        return attemptService.getOrThrow(attemptId);
    }

    /** Powers the Reports page: every attempt a given learner has made. */
    @GetMapping
    public List<Document> listForLearner(@RequestParam String learnerId) {
        return attemptService.listForLearner(learnerId);
    }

    /** Deletes an attempt from the system. */
    @DeleteMapping("/{attemptId}")
    public void delete(@PathVariable String attemptId) {
        attemptService.delete(attemptId);
    }
}
