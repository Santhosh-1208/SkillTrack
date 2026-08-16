package com.skilltrack.api.dto;

import jakarta.validation.constraints.NotBlank;

public class HintRequest {

    @NotBlank(message = "hintId is required")
    private String hintId;

    public HintRequest() {
    }

    public String getHintId() {
        return hintId;
    }

    public void setHintId(String hintId) {
        this.hintId = hintId;
    }
}
