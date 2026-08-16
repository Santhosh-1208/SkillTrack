package com.skilltrack.api.service;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class NodalCircuitSolver {

    /**
     * Solves nodal analysis for the Electrical Panel circuit breaker network.
     * Takes active panel states and solves the linear system Y * V = I.
     * 
     * In a simplified node-admittance matrix model:
     * Node 0: Main line input (230V AC)
     * Node 1: Voltmeter probe terminal post-breaker
     * Switch state determines conductance G between Node 0 and Node 1.
     */
    public double solveProbeVoltage(Map<String, Object> state) {
        boolean mainBreakerClosed = !"OFF".equals(state.get("mainBreaker"));
        boolean isGrounded = Boolean.TRUE.equals(state.get("groundConnected"));

        // If the main line is open (Breaker switched OFF), there's 0 voltage
        if (!mainBreakerClosed) {
            return 0.0;
        }

        // Standard nodal analysis:
        // G_breaker * (V1 - V0) + G_load * (V1 - 0) + G_ground * (V1 - 0) = 0
        // V1 = (G_breaker * V0) / (G_breaker + G_load + G_ground)
        double v0 = 230.0; // Input Voltage
        double gBreaker = 1000.0; // conductance of closed switch (low resistance)
        double gLoad = 1.0; // load conductance (high resistance)
        double gGround = isGrounded ? 10000.0 : 0.0; // grounding path

        double v1 = (gBreaker * v0) / (gBreaker + gLoad + gGround);

        // Round to 1 decimal place
        return Math.round(v1 * 10.0) / 10.0;
    }

    /**
     * Solves induction motor equivalent circuit for Phase 1, 2, 3 currents.
     * Parametric fault injection: 'brokenRotorBar', 'phaseLoss'
     */
    public Map<String, Double> solveMotorCurrents(Map<String, Object> state) {
        boolean phaseLoss = Boolean.TRUE.equals(state.get("phaseLoss"));
        boolean brokenRotor = Boolean.TRUE.equals(state.get("brokenRotorBar"));
        double loadTorque = state.containsKey("loadTorque") ? ((Number)state.get("loadTorque")).doubleValue() : 50.0;
        
        // Base nominal current
        double nominalCurrent = 10.0 + (loadTorque * 0.1); 

        if (phaseLoss) {
            // Single-phasing: L3 drops to 0, L1 and L2 spike or stay nominal depending on load
            return Map.of("L1", nominalCurrent, "L2", nominalCurrent, "L3", 0.0);
        } else if (brokenRotor) {
            // Current pulsation / higher average
            return Map.of("L1", nominalCurrent * 1.3, "L2", nominalCurrent * 1.3, "L3", nominalCurrent * 1.3);
        } else {
            return Map.of("L1", nominalCurrent, "L2", nominalCurrent, "L3", nominalCurrent);
        }
    }

    /**
     * Darcy-Weisbach / Pressure drop parametric model for fluid network.
     */
    public Map<String, Double> solveHydraulicPressure(Map<String, Object> state) {
        boolean v1Closed = Boolean.TRUE.equals(state.get("valveV1Closed"));
        boolean branchBBlocked = Boolean.TRUE.equals(state.get("branchBBlocked"));

        double pumpPressure = 3000.0;
        
        if (v1Closed && branchBBlocked) {
            // Deadhead condition forces pressure over relief valve
            return Map.of("pumpPressure", pumpPressure * 1.2, "actuatorPressure", 0.0);
        } else if (v1Closed) {
            // Normal operation with branch A isolated
            return Map.of("pumpPressure", pumpPressure, "actuatorPressure", pumpPressure - 100.0);
        } else {
            // Normal full flow
            return Map.of("pumpPressure", pumpPressure, "actuatorPressure", pumpPressure - 200.0);
        }
    }
}
