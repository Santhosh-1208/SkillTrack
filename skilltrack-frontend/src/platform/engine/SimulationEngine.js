/**
 * SimulationEngine — Central Orchestrator for SkillTrack SimOS
 * 
 * Responsibilities:
 * 1. Load a Mission from a DSL definition
 * 2. Spin up the correct Provider via ProviderRegistry
 * 3. Wire the RuleEngine to EventBus events
 * 4. Drive the StateManager through the mission lifecycle
 * 5. Expose a clean API for UI widgets to interact with
 */

import { eventBus } from './EventBus.js';
import { stateManager, MissionStates } from './StateManager.js';
import { ruleEngine } from './RuleEngine.js';
import { dslParser } from './DSLParser.js';
import { providerRegistry } from '../providers/ProviderRegistry.js';

export class SimulationEngine {
  constructor() {
    this.mission = null;
    this.provider = null;
    this.score = 0;
    this.mistakes = 0;
    this.hintsUsed = [];
    this.startTime = null;
    this._unsubscribe = null;
  }

  /**
   * Record hint / AI help usage and apply penalty.
   * @param {'hint' | 'ai_help'} type 
   */
  recordHint(type = 'hint') {
    const penalty = type === 'ai_help' ? 10 : 5;
    this.score = Math.max(0, this.score - penalty);
    this.hintsUsed.push({ type, penalty, timestamp: Date.now() });

    eventBus.publish({
      id: crypto.randomUUID?.() ?? Date.now().toString(),
      type: 'HINT_RECORDED',
      source: 'simulation-engine',
      target: 'all',
      timestamp: Date.now(),
      metadata: { type, penalty, newScore: this.score, hintsCount: this.hintsUsed.length },
      severity: 'INFO'
    });
  }

  /**
   * Load and start a mission from a DSL definition.
   * @param {Object} rawMission - The mission definition object
   */
  async loadMission(rawMission) {
    // 1. Parse & validate DSL
    const { mission, errors } = dslParser.parse(rawMission);
    if (errors.length > 0) {
      throw new Error(`Mission DSL validation failed:\n${errors.join('\n')}`);
    }
    this.mission = mission;

    // 2. Spin up the provider
    this.provider = providerRegistry.createProvider(
      mission.environment.provider,
      `${mission.id}-provider`,
      mission.environment.config || {}
    );
    await this.provider.init();

    // 3. Load rules into the RuleEngine
    ruleEngine.loadRules(mission.rules);

    // 4. Subscribe to RULE_TRIGGERED events to drive state transitions
    this._unsubscribe = eventBus.subscribe('RULE_TRIGGERED', (event) => {
      this._handleRuleTriggered(event);
    });

    // 5. Start mission lifecycle
    this.startTime = Date.now();
    this.score = mission.scoring.max;
    stateManager.transition(MissionStates.BRIEFING);

    eventBus.publish({
      id: crypto.randomUUID?.() ?? Date.now().toString(),
      type: 'MISSION_LOADED',
      source: 'simulation-engine',
      target: 'all',
      timestamp: Date.now(),
      metadata: { missionId: mission.id, title: mission.title },
      severity: 'INFO'
    });

    return mission;
  }

  /**
   * Start execution phase (called when the learner clicks "Begin Simulation")
   */
  beginExecution() {
    stateManager.transition(MissionStates.EXECUTION);
  }

  /**
   * Execute a command in the current provider environment.
   * Also re-evaluates rules after each command.
   * @param {string} command
   */
  async executeCommand(command) {
    if (!this.provider) throw new Error('No provider loaded. Call loadMission() first.');

    const output = await this.provider.executeCommand(command);

    // After every command, get fresh state and evaluate rules
    const envState = await this.provider.getState();
    const stateMap = { [this.mission.environment.provider]: envState };
    
    // Evaluate rules via engine
    ruleEngine.evaluate(stateMap);

    // Synchronous objective unlock to guarantee zero race conditions
    if (this.mission?.rules) {
      for (const rule of this.mission.rules) {
        if (ruleEngine._evaluateCondition(rule.condition, stateMap)) {
          if (rule.action === 'UNLOCK_OBJECTIVE' && rule.metadata?.objectiveId) {
            const obj = this.mission.objectives.find(o => o.id === rule.metadata.objectiveId);
            if (obj) obj.completed = true;
          } else if (rule.action === 'COMPLETE_MISSION') {
            if (stateManager.currentState !== MissionStates.SUCCESS) {
              stateManager.transition(MissionStates.SUCCESS);
            }
          }
        }
      }
    }

    eventBus.publish({
      id: crypto.randomUUID?.() ?? Date.now().toString(),
      type: 'COMMAND_EXECUTED',
      source: 'simulation-engine',
      target: 'all',
      timestamp: Date.now(),
      metadata: { command, output },
      severity: 'INFO'
    });

    return output;
  }

  /**
   * Record a mistake (wrong action, skipped safety step, etc.)
   * Reduces score by penaltyPerMistake.
   */
  recordMistake(reason = '') {
    this.mistakes += 1;
    const penalty = this.mission?.scoring?.penaltyPerMistake ?? 5;
    this.score = Math.max(0, this.score - penalty);

    eventBus.publish({
      id: crypto.randomUUID?.() ?? Date.now().toString(),
      type: 'MISTAKE_RECORDED',
      source: 'simulation-engine',
      target: 'all',
      timestamp: Date.now(),
      metadata: { reason, newScore: this.score, mistakeCount: this.mistakes },
      severity: 'WARN'
    });
  }

  /**
   * Get the current mission objectives with completion status.
   */
  getObjectives() {
    return (this.mission?.objectives ?? []).map(o => ({ ...o }));
  }

  /**
   * Get the current mission score.
   */
  getScore() {
    const elapsed = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    const timeBonus = (this.mission?.scoring?.timeBonus && elapsed < 120) ? 10 : 0;
    return Math.min(100, this.score + timeBonus);
  }

  /**
   * Handle rule trigger events from the RuleEngine.
   * @private
   */
  _handleRuleTriggered(event) {
    const { action, metadata } = event.metadata ?? {};
    switch (action) {
      case 'COMPLETE_MISSION':
        if (stateManager.currentState !== MissionStates.SUCCESS) {
          stateManager.transition(MissionStates.SUCCESS);
        }
        break;
      case 'FAIL_MISSION':
        stateManager.transition(MissionStates.FAILURE);
        break;
      case 'TRIGGER_WARNING':
        stateManager.transition(MissionStates.WARNING);
        break;
      case 'UNLOCK_OBJECTIVE':
        if (this.mission && metadata?.objectiveId) {
          const obj = this.mission.objectives.find(o => o.id === metadata.objectiveId);
          if (obj && !obj.completed) {
            obj.completed = true;
            eventBus.publish({
              id: crypto.randomUUID?.() ?? Date.now().toString(),
              type: 'OBJECTIVE_UNLOCKED',
              source: 'simulation-engine',
              target: 'all',
              timestamp: Date.now(),
              metadata: { objectiveId: metadata.objectiveId, objectives: this.getObjectives() },
              severity: 'INFO'
            });
          }
        }
        break;
    }
  }

  /**
   * Tear down the engine when the simulation is complete.
   */
  async destroy() {
    if (this._unsubscribe) this._unsubscribe();
    if (this.provider) await this.provider.destroy();
    this.mission = null;
    this.provider = null;
  }
}

export const simulationEngine = new SimulationEngine();
