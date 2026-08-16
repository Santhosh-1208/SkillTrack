/**
 * Event Bus for SkillTrack SimOS
 * Handles the distribution of simulation events.
 * 
 * Event Schema:
 * {
 *   id: string (uuid)
 *   type: string (e.g., 'ACTION', 'SYSTEM', 'WARNING', 'ERROR')
 *   source: string (e.g., 'ubuntu-provider', 'terminal-widget')
 *   target: string (e.g., 'rule-engine', 'all')
 *   timestamp: number (epoch)
 *   metadata: object (payload)
 *   severity: string ('INFO', 'WARN', 'CRITICAL')
 * }
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to a specific event type.
   * @param {string} eventType 
   * @param {Function} callback 
   */
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType).delete(callback);
    };
  }

  /**
   * Subscribe to all events.
   * @param {Function} callback 
   */
  subscribeAll(callback) {
    return this.subscribe('*', callback);
  }

  /**
   * Publish an event to the bus.
   * @param {Object} event - The event object matching the schema.
   */
  publish(event) {
    // Basic validation
    if (!event.type || !event.source || !event.timestamp) {
      console.warn("EventBus: published event missing required fields.", event);
    }

    // Notify specific type listeners
    if (this.listeners.has(event.type)) {
      this.listeners.get(event.type).forEach(callback => callback(event));
    }

    // Notify wildcard listeners
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => callback(event));
    }
  }

  /**
   * Clear all subscriptions.
   */
  clear() {
    this.listeners.clear();
  }
}

// Singleton instance for the platform
export const eventBus = new EventBus();
