import { BaseProvider } from './BaseProvider.js';

export class SqlProvider extends BaseProvider {
  constructor(id, config = {}) {
    super(id, config);
    this.state = {
      lastCommand: '',
      indexCreated: false,
      queryTimeMs: 'SLOW'
    };
  }

  async init() {
    await super.init();
  }

  async getState() {
    return this.state;
  }

  async executeCommand(command) {
    console.log(`[SqlProvider] Executing: ${command}`);
    this.state.lastCommand = command.trim();
    
    if (command.startsWith('EXPLAIN ANALYZE')) {
      return this.state.indexCreated ? 'Execution Time: 45ms' : 'Execution Time: 4500ms';
    } else if (command.startsWith('CREATE INDEX CONCURRENTLY idx_attempts_learner')) {
      this.state.indexCreated = true;
      this.state.queryTimeMs = 'FAST';
      return 'CREATE INDEX';
    }
    
    return `Unknown SQL command`;
  }
}
