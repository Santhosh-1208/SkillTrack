package com.skilltrack.api.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class DagRulesEngine {

    public static class ValidationResult {
        public final boolean isValid;
        public final List<String> warnings;
        public final int safetyRiskScore;
        public final boolean spawnSubtask;
        public final String subtaskMessage;

        public ValidationResult(boolean isValid, List<String> warnings, int safetyRiskScore, boolean spawnSubtask, String subtaskMessage) {
            this.isValid = isValid;
            this.warnings = warnings;
            this.safetyRiskScore = safetyRiskScore;
            this.spawnSubtask = spawnSubtask;
            this.subtaskMessage = subtaskMessage;
        }
    }

    public ValidationResult validateSequence(String simulationId, List<Map<String, Object>> actions, Map<String, Object> currentState) {
        if ("LOTO_PROC_004".equals(simulationId)) {
            return validateLoto(actions);
        } else if ("PREV_MAINT_008".equals(simulationId)) {
            return validatePrevMaint(actions, currentState);
        } else if ("EQUIP_ASSEMBLY_010".equals(simulationId)) {
            return validateAssembly(actions, currentState);
        }
        return new ValidationResult(true, new ArrayList<>(), 0, false, null);
    }

    private ValidationResult validateLoto(List<Map<String, Object>> actions) {
        List<String> warnings = new ArrayList<>();
        int riskScore = 0;

        boolean breakerOff = false;
        boolean lockApplied = false;
        boolean tagApplied = false;
        
        for (Map<String, Object> action : actions) {
            String stepId = (String) action.get("step_id");
            if (stepId == null) continue;

            switch (stepId) {
                case "LOTO_S2": // Isolate breaker
                    breakerOff = true;
                    break;
                case "LOTO_S3": // Apply lock
                    if (!breakerOff) {
                        warnings.add("CRITICAL: Safety padlock applied onto an ACTIVE breaker line! Isolate power first.");
                        riskScore += 45;
                    }
                    lockApplied = true;
                    break;
                case "LOTO_S4": // Apply tag
                    if (!lockApplied) {
                        warnings.add("WARNING: Danger warning tag hung directly without lockout padlock. Tag can slip off.");
                        riskScore += 20;
                    }
                    tagApplied = true;
                    break;
                case "LOTO_S5": // Voltmeter probe
                    if (!breakerOff) {
                        warnings.add("DANGER: Multimeter probe touched LIVE high-voltage line (230V) without isolation! High risk of arc flash.");
                        riskScore += 80;
                    }
                    break;
            }
        }
        return new ValidationResult(warnings.isEmpty(), warnings, Math.min(100, riskScore), false, null);
    }

    private ValidationResult validatePrevMaint(List<Map<String, Object>> actions, Map<String, Object> currentState) {
        List<String> warnings = new ArrayList<>();
        boolean spawnSubtask = false;
        String subtaskMsg = null;

        if (currentState != null && currentState.containsKey("motorTempC")) {
            Object tempObj = currentState.get("motorTempC");
            double temp = 0;
            if (tempObj instanceof Number) {
                temp = ((Number) tempObj).doubleValue();
            } else if (tempObj instanceof String) {
                try {
                    temp = Double.parseDouble((String) tempObj);
                } catch (NumberFormatException ignored) {}
            }
            if (temp > 80.0) {
                spawnSubtask = true;
                subtaskMsg = "Abnormal temperature reading detected (" + temp + "C). Spawning Emergency Diagnostic sub-task.";
            }
        }
        return new ValidationResult(true, warnings, 0, spawnSubtask, subtaskMsg);
    }

    private ValidationResult validateAssembly(List<Map<String, Object>> actions, Map<String, Object> currentState) {
        List<String> warnings = new ArrayList<>();
        int riskScore = 0;

        if (currentState != null) {
            if ("upside_down".equals(currentState.get("impellerOrientation"))) {
                warnings.add("CRITICAL: Impeller inserted upside down. This will cause catastrophic failure.");
                riskScore += 50;
            }
            if ("circular".equals(currentState.get("boltTighteningPattern"))) {
                warnings.add("WARNING: Bolts tightened in a circular pattern. Star pattern required to prevent warping.");
                riskScore += 30;
            }
        }
        return new ValidationResult(warnings.isEmpty(), warnings, Math.min(100, riskScore), false, null);
    }
}
