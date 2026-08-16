package com.skilltrack.api.dto;

import jakarta.validation.constraints.NotBlank;

public class ActionRequest {

    @NotBlank(message = "stepId is required")
    private String stepId;

    /**
     * One of: step_completed, step_skipped, wrong_action
     * (matches attempt-log-schema.json actions[].action_type)
     */
    @NotBlank(message = "actionType is required")
    private String actionType;

    public ActionRequest() {
    }

    public String getStepId() {
        return stepId;
    }

    public void setStepId(String stepId) {
        this.stepId = stepId;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }
}
