import { eventBus } from './EventBus.js';

/**
 * State Manager for SkillTrack SimOS
 * Handles the high-level mission state machine.
 * 
 * Valid States:
 * START -> BRIEFING -> EXECUTION -> WARNING -> RECOVERY -> SUCCESS -> FAILURE -> DEBRIEF
 */

export const MissionStates = {
  START: 'START',
  BRIEFING: 'BRIEFING',
  EXECUTION: 'EXECUTION',
  WARNING: 'WARNING',
  RECOVERY: 'RECOVERY',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  DEBRIEF: 'DEBRIEF'
};

const ValidTransitions = {
  START: ['BRIEFING'],
  BRIEFING: ['EXECUTION'],
  EXECUTION: ['WARNING', 'SUCCESS', 'FAILURE'],
  WARNING: ['RECOVERY', 'FAILURE'], // Can fail during warning
  RECOVERY: ['EXECUTION', 'SUCCESS', 'FAILURE'],
  SUCCESS: ['DEBRIEF'],
  FAILURE: ['DEBRIEF'],
  DEBRIEF: []
};

export class StateManager {
  constructor() {
    this.currentState = MissionStates.START;
    this.history = [];
  }

  /**
   * Transition to a new state.
   * @param {string} newState - The state from MissionStates
   * @param {Object} context - Optional context data
   */
  transition(newState, context = {}) {
    if (!Object.values(MissionStates).includes(newState)) {
      console.error(`Invalid state transition requested: ${newState}`);
      return;
    }
    
    if (this.currentState === newState) return;
    
    const allowed = ValidTransitions[this.currentState] || [];
    if (!allowed.includes(newState)) {
      console.warn(`Illegal state transition from ${this.currentState} to ${newState}`);
      return;
    }
    
    const oldState = this.currentState;
    this.history.push({ state: oldState, timestamp: Date.now() });
    this.currentState = newState;
    
    // Broadcast state change
    eventBus.publish({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      type: 'STATE_CHANGE',
      source: 'state-manager',
      target: 'all',
      timestamp: Date.now(),
      metadata: { oldState, newState, context },
      severity: 'INFO'
    });
  }

  getCurrentState() {
    return this.currentState;
  }
}

export const stateManager = new StateManager();
