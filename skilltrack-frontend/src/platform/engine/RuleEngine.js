import { eventBus } from './EventBus.js';

/**
 * Deterministic Rule Engine for SkillTrack SimOS
 * Evaluates rules based on mission DSL definitions.
 * No Java/JS code should be needed for scenario rule definition.
 */
export class RuleEngine {
  constructor() {
    this.rules = [];
  }

  /**
   * Load a set of rules for the current mission.
   * @param {Array} rules 
   */
  loadRules(rules) {
    this.rules = rules;
  }

  /**
   * Evaluate state against active rules.
   * Normally this would be triggered by an event.
   * @param {Object} state - The current simulation state map
   */
  evaluate(state) {
    for (const rule of this.rules) {
      const result = this._evaluateCondition(rule.condition, state);
      if (result) {
        this._executeAction(rule.action, rule.metadata || {});
      }
    }
  }

  _evaluateCondition(condition, state) {
    if (!condition) return true;

    if (condition.and) {
      return condition.and.every(cond => this._evaluateCondition(cond, state));
    }
    if (condition.or) {
      return condition.or.some(cond => this._evaluateCondition(cond, state));
    }
    if (condition.eq) {
      const [left, right] = condition.eq;
      return this._resolveValue(left, state) === this._resolveValue(right, state);
    }
    if (condition.neq) {
      const [left, right] = condition.neq;
      return this._resolveValue(left, state) !== this._resolveValue(right, state);
    }

    console.warn('Unknown condition type:', condition);
    return false;
  }

  _resolveValue(value, state) {
    if (typeof value === 'string' && value.startsWith('$state.')) {
      const path = value.slice(7).split('.');
      let current = state;
      for (const key of path) {
        if (current === undefined || current === null) return undefined;
        current = current[key];
      }
      return current;
    }
    return value;
  }

  _executeAction(action, metadata = {}) {
    console.log(`[RuleEngine] Executing action: ${action}`, metadata);
    eventBus.publish({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      type: 'RULE_TRIGGERED',
      source: 'rule-engine',
      target: 'simulation-engine',
      timestamp: Date.now(),
      metadata: { action, ...metadata },
      severity: 'INFO'
    });
  }
}

export const ruleEngine = new RuleEngine();
