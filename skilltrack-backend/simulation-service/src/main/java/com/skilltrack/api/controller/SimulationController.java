package com.skilltrack.api.controller;

import com.skilltrack.api.service.SimulationService;
import com.skilltrack.api.service.NodalCircuitSolver;
import com.skilltrack.api.service.DagRulesEngine;
import org.bson.Document;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/simulations")
public class SimulationController {

    private final SimulationService simulationService;
    private final NodalCircuitSolver nodalCircuitSolver;
    private final DagRulesEngine dagRulesEngine;

    public SimulationController(SimulationService simulationService,
                                NodalCircuitSolver nodalCircuitSolver,
                                DagRulesEngine dagRulesEngine) {
        this.simulationService = simulationService;
        this.nodalCircuitSolver = nodalCircuitSolver;
        this.dagRulesEngine = dagRulesEngine;
    }

    @GetMapping
    public List<Document> list(@RequestParam(required = false) String category) {
        if (category != null && !category.isBlank()) {
            return simulationService.listSummariesByCategory(category);
        }
        return simulationService.listSummaries();
    }

    @GetMapping("/unattended")
    public List<Document> listUnattended(@RequestParam String date) {
        return simulationService.getUnattendedSimulations(date);
    }

    @GetMapping("/{simulationId}")
    public Document getOne(@PathVariable String simulationId) {
        return simulationService.getForLearner(simulationId);
    }

    @PostMapping
    public Document create(@RequestBody Document doc) {
        return simulationService.create(doc);
    }

    @PutMapping("/{simulationId}")
    public Document update(@PathVariable String simulationId, @RequestBody Document patch) {
        return simulationService.update(simulationId, patch);
    }

    @DeleteMapping("/{simulationId}")
    public void delete(@PathVariable String simulationId) {
        simulationService.delete(simulationId);
    }

    @PostMapping("/solve/electrical")
    public Document solveElectrical(@RequestBody Map<String, Object> state) {
        double voltage = nodalCircuitSolver.solveProbeVoltage(state);
        Document res = new Document();
        res.put("voltage", voltage);
        return res;
    }

    @PostMapping("/solve/motor")
    public Document solveMotor(@RequestBody Map<String, Object> state) {
        Map<String, Double> currents = nodalCircuitSolver.solveMotorCurrents(state);
        Document res = new Document();
        res.put("currents", currents);
        return res;
    }

    @PostMapping("/solve/hydraulic")
    public Document solveHydraulic(@RequestBody Map<String, Object> state) {
        Map<String, Double> pressures = nodalCircuitSolver.solveHydraulicPressure(state);
        Document res = new Document();
        res.put("pressures", pressures);
        return res;
    }

    @PostMapping("/validate/dag")
    public Document validateDag(@RequestBody Map<String, Object> payload) {
        String simulationId = (String) payload.get("simulation_id");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> actions = (List<Map<String, Object>>) payload.get("actions");
        @SuppressWarnings("unchecked")
        Map<String, Object> currentState = (Map<String, Object>) payload.get("current_state");

        DagRulesEngine.ValidationResult result = dagRulesEngine.validateSequence(simulationId, actions, currentState);
        
        Document res = new Document();
        res.put("isValid", result.isValid);
        res.put("warnings", result.warnings);
        res.put("safetyRiskScore", result.safetyRiskScore);
        res.put("spawnSubtask", result.spawnSubtask);
        res.put("subtaskMessage", result.subtaskMessage);
        return res;
    }
}
