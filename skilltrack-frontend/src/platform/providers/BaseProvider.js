export class BaseProvider {
  constructor(id, config = {}) {
    this.id = id;
    this.config = config;
  }

  /**
   * Initializes the provider environment.
   */
  async init() {
    console.log(`[Provider] ${this.id} initialized.`);
  }

  /**
   * Returns the current state of the environment.
   * Format is provider-specific.
   */
  async getState() {
    return {};
  }

  /**
   * Execute a command in this provider's environment.
   * @param {string} command 
   */
  async executeCommand(command) {
    throw new Error('executeCommand not implemented in BaseProvider');
  }

  /**
   * Cleanup resources.
   */
  async destroy() {
    console.log(`[Provider] ${this.id} destroyed.`);
  }
}
