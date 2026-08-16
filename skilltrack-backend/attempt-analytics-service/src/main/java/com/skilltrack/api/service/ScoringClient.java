package com.skilltrack.api.service;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Talks to the Python FastAPI scoring engine (ai-scoring-service).
 * The Spring Boot backend never scores attempts itself - it hands the
 * simulation config + attempt log over and gets back a final_score object,
 * which it then persists on the attempt document. This keeps the "AI layer"
 * swappable (rule-based today, real ML later) without touching this API.
 */
@Service
public class ScoringClient {

    private static final Logger log = LoggerFactory.getLogger(ScoringClient.class);

    private final RestTemplate restTemplate;
    private final String aiServiceUrl;

    public ScoringClient(@Value("${skilltrack.ai-service-url}") String aiServiceUrl) {
        this.restTemplate = new RestTemplate();
        this.aiServiceUrl = aiServiceUrl;
    }

    /**
     * @param simulationConfig the full simulation config document (sop_steps, decision_points,
     *                         possible_mistakes, competency_weights, scoring, recommendation_rules)
     * @param attempt          the full attempt document (actions, decisions_made, hints_used)
     * @return the final_score object as returned by the AI service, ready to store on the attempt
     */
    public Map<String, Object> scoreAttempt(Document simulationConfig, Document attempt) {
        String url = aiServiceUrl + "/score";

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("simulation", simulationConfig);
        requestBody.put("attempt", attempt);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getBody() == null) {
                throw new IllegalStateException("Scoring service returned an empty response");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) response.getBody();
            return result;

        } catch (RestClientException e) {
            log.error("Failed to reach AI scoring service at {}: {}", url, e.getMessage());
            throw new ScoringServiceUnavailableException(
                    "Could not reach the AI scoring service at " + url +
                            ". Make sure ai-scoring-service is running (uvicorn main:app --port 8001).", e);
        }
    }

    public static class ScoringServiceUnavailableException extends RuntimeException {
        public ScoringServiceUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
