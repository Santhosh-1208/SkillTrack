package com.skilltrack.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class DecisionRequest {

    @NotBlank(message = "decisionId is required")
    private String decisionId;

    @NotBlank(message = "optionIdChosen is required")
    private String optionIdChosen;

    @NotNull(message = "timeTakenSeconds is required")
    private Double timeTakenSeconds;

    public DecisionRequest() {
    }

    public String getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(String decisionId) {
        this.decisionId = decisionId;
    }

    public String getOptionIdChosen() {
        return optionIdChosen;
    }

    public void setOptionIdChosen(String optionIdChosen) {
        this.optionIdChosen = optionIdChosen;
    }

    public Double getTimeTakenSeconds() {
        return timeTakenSeconds;
    }

    public void setTimeTakenSeconds(Double timeTakenSeconds) {
        this.timeTakenSeconds = timeTakenSeconds;
    }
}
