package com.skilltrack.api.dto;

import jakarta.validation.constraints.NotBlank;

public class StartAttemptRequest {

    @NotBlank(message = "simulationId is required")
    private String simulationId;

    @NotBlank(message = "learnerId is required")
    private String learnerId;

    public StartAttemptRequest() {
    }

    public String getSimulationId() {
        return simulationId;
    }

    public void setSimulationId(String simulationId) {
        this.simulationId = simulationId;
    }

    public String getLearnerId() {
        return learnerId;
    }

    public void setLearnerId(String learnerId) {
        this.learnerId = learnerId;
    }
}
