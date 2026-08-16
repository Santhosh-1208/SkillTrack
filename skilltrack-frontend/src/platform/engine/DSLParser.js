/**
 * DSL Parser for SkillTrack SimOS
 * 
 * Parses a mission definition JSON/object into a runtime-ready Mission object.
 * 
 * Mission DSL Schema:
 * {
 *   id: string,
 *   title: string,
 *   environment: { provider: "ubuntu" | "git" | "sql" | "windows" },
 *   widgets: ["terminal", "file-explorer", "logs"],
 *   objectives: [{ id, description, required }],
 *   rules: [
 *     {
 *       id: string,
 *       condition: { and/or: [...], eq: [...], neq: [...] },
 *       action: "COMPLETE_MISSION" | "TRIGGER_WARNING" | "FAIL_MISSION" | "UNLOCK_OBJECTIVE",
 *       metadata: {}
 *     }
 *   ],
 *   scoring: { max: number, penaltyPerMistake: number, timeBonus: boolean },
 *   hints: [{ trigger_after_seconds: number, message: string }]
 * }
 */

const REQUIRED_FIELDS = ['id', 'title', 'environment', 'objectives', 'rules'];
const VALID_ACTIONS = ['COMPLETE_MISSION', 'TRIGGER_WARNING', 'FAIL_MISSION', 'UNLOCK_OBJECTIVE'];

export class DSLParser {
  /**
   * Parse and validate a mission definition.
   * @param {Object} raw - The raw mission definition object
   * @returns {{ mission: Object, errors: string[] }}
   */
  parse(raw) {
    const errors = [];

    // Validate required fields
    for (const field of REQUIRED_FIELDS) {
      if (!raw[field]) {
        errors.push(`Missing required field: "${field}"`);
      }
    }

    // Validate environment
    if (raw.environment && !raw.environment.provider) {
      errors.push('environment.provider is required');
    }

    // Validate rules
    if (Array.isArray(raw.rules)) {
      raw.rules.forEach((rule, idx) => {
        if (!rule.id) errors.push(`Rule at index ${idx} is missing "id"`);
        if (!rule.condition) errors.push(`Rule "${rule.id || idx}" is missing "condition"`);
        if (!rule.action) errors.push(`Rule "${rule.id || idx}" is missing "action"`);
        if (rule.action && !VALID_ACTIONS.includes(rule.action)) {
          errors.push(`Rule "${rule.id || idx}" has unknown action: "${rule.action}". Valid: ${VALID_ACTIONS.join(', ')}`);
        }
      });
    }

    // Validate objectives
    if (Array.isArray(raw.objectives)) {
      raw.objectives.forEach((obj, idx) => {
        if (!obj.id) errors.push(`Objective at index ${idx} is missing "id"`);
        if (!obj.description) errors.push(`Objective "${obj.id || idx}" is missing "description"`);
      });
    }

    if (errors.length > 0) {
      return { mission: null, errors };
    }

    // Build the normalised mission object
    const mission = {
      id: raw.id,
      title: raw.title,
      description: raw.description || '',
      environment: raw.environment,
      widgets: raw.widgets || ['terminal'],
      objectives: raw.objectives.map(obj => ({
        id: obj.id,
        description: obj.description,
        required: obj.required !== false,
        completed: false,
      })),
      rules: raw.rules,
      scoring: {
        max: raw.scoring?.max ?? 100,
        penaltyPerMistake: raw.scoring?.penaltyPerMistake ?? 5,
        timeBonus: raw.scoring?.timeBonus ?? false,
      },
      hints: raw.hints || [],
    };

    return { mission, errors: [] };
  }
}

export const dslParser = new DSLParser();
