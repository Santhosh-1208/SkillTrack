package com.skilltrack; // Package for API Gateway

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the SkillTrack API Gateway.
 */
@SpringBootApplication
public class ApiGatewayApplication {
    /**
     * Starts the Spring Boot application.
     *
     * @param args command‑line arguments (not used)
     */
    public static void main(final String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
    // Spring Boot requires the class to be instantiable, so we cannot hide the constructor.
}
