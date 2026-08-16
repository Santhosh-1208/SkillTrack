/**
 * SimOS Engine React Hook
 * 
 * Bridges the SimulationEngine (pure JS) into React state,
 * so any widget can subscribe to mission events cleanly.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { SimulationEngine } from "../engine/SimulationEngine.js";
import { eventBus } from "../engine/EventBus.js";
import { MissionStates } from "../engine/StateManager.js";
import { SCENARIO_REGISTRY } from "../../scenarios/index.js";

export function useSimulationEngine(missionId, options = {}) {
  const engineRef = useRef(null);
  const [missionState, setMissionState] = useState(MissionStates.START);
  const [objectives, setObjectives] = useState([]);
  const [score, setScore] = useState(100);
  const [hints, setHints] = useState([]);
  const [logs, setLogs] = useState(["SimOS engine initializing..."]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [usedHints, setUsedHints] = useState([]);

  // Sync objectives helper
  const syncObjectives = useCallback(() => {
    if (engineRef.current) {
      setObjectives([...engineRef.current.getObjectives()]);
      setScore(engineRef.current.getScore());
    }
  }, []);

  const onObjectiveCompletedRef = useRef(options.onObjectiveCompleted);
  useEffect(() => {
    onObjectiveCompletedRef.current = options.onObjectiveCompleted;
  }, [options.onObjectiveCompleted]);

  useEffect(() => {
    const engine = new SimulationEngine();
    engineRef.current = engine;

    // Subscribe to state changes
    const unsubState = eventBus.subscribe("STATE_CHANGE", (event) => {
      setMissionState(event.metadata.newState);
    });

    const unsubRule = eventBus.subscribe("RULE_TRIGGERED", () => {
      setTimeout(() => syncObjectives(), 0);
    });

    const unsubUnlocked = eventBus.subscribe("OBJECTIVE_UNLOCKED", (event) => {
      syncObjectives();
      if (event.metadata?.objectiveId) {
        onObjectiveCompletedRef.current?.(event.metadata.objectiveId);
      }
    });

    const unsubMistake = eventBus.subscribe("MISTAKE_RECORDED", (event) => {
      setScore(event.metadata.newScore);
      setLogs((prev) => [...prev, `⚠ Mistake recorded: ${event.metadata.reason}`]);
    });

    const unsubHint = eventBus.subscribe("HINT_RECORDED", (event) => {
      setScore(event.metadata.newScore);
      setUsedHints((prev) => [...prev, event.metadata.type]);
      setLogs((prev) => [...prev, `💡 ${event.metadata.type === 'ai_help' ? 'AI Assistant Help used (-10 pts)' : 'Hint requested (-5 pts)'}`]);
    });

    const unsubCommand = eventBus.subscribe("COMMAND_EXECUTED", (event) => {
      setLogs((prev) => [...prev, `$ ${event.metadata.command}`, event.metadata.output]);
      syncObjectives();
    });

    // Load the mission
    const rawMission = SCENARIO_REGISTRY[missionId];
    if (!rawMission) {
      setError(`No scenario found for mission ID: "${missionId}"`);
      setReady(true);
      return;
    }

    engine
      .loadMission(rawMission)
      .then((mission) => {
        setObjectives([...mission.objectives]);
        setHints(mission.hints || []);
        setScore(mission.scoring.max);
        setLogs([
          `SimOS engine ready.`,
          `Mission: ${mission.title}`,
          `Provider: ${mission.environment.provider}`,
          `Type 'help' for available commands.`,
        ]);
        setReady(true);
      })
      .catch((err) => {
        setError(err.message);
        setReady(true);
      });

    return () => {
      unsubState();
      unsubRule();
      unsubUnlocked();
      unsubMistake();
      unsubHint();
      unsubCommand();
      engine.destroy();
    };
  }, [missionId]);

  const beginExecution = useCallback(() => {
    engineRef.current?.beginExecution();
  }, []);

  const executeCommand = useCallback(async (command) => {
    if (!engineRef.current) return "Engine not ready.";
    try {
      return await engineRef.current.executeCommand(command);
    } catch (e) {
      engineRef.current.recordMistake(e.message);
      return `Error: ${e.message}`;
    }
  }, []);

  const recordMistake = useCallback((reason) => {
    engineRef.current?.recordMistake(reason);
  }, []);

  const recordHint = useCallback((type) => {
    engineRef.current?.recordHint(type);
  }, []);

  // Skip the current active (first uncompleted) objective.
  // Applies a small score penalty, marks it complete, and re-syncs state.
  // If it was the last objective, transitions to SUCCESS so onMissionComplete fires.
  const skipObjective = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const objs = engine.getObjectives();
    const firstUncompleted = objs.find(o => !o.completed);
    if (!firstUncompleted) return;

    // Penalise for skipping (-10 pts)
    engine.recordMistake(`Skipped objective: ${firstUncompleted.description}`);

    // Force-complete it so the engine advances
    firstUncompleted.completed = true;

    // Re-sync React state
    setTimeout(() => syncObjectives(), 0);

    // If everything is now done, trigger mission success
    const remaining = objs.filter(o => !o.completed);
    if (remaining.length === 0) {
      // All objectives finished — let the engine know
      try { engine.forceSuccess?.(); } catch (_) {}
    }
  }, [syncObjectives]);

  return {
    missionState,
    objectives,
    score,
    hints,
    logs,
    usedHints,
    ready,
    error,
    beginExecution,
    executeCommand,
    recordMistake,
    recordHint,
    skipObjective,
  };
}
