import { UbuntuProvider } from './UbuntuProvider.js';
import { GitProvider } from './GitProvider.js';
import { SqlProvider } from './SqlProvider.js';

class ProviderRegistry {
  constructor() {
    this.providers = {
      ubuntu: UbuntuProvider,
      git: GitProvider,
      sql: SqlProvider
    };
  }

  createProvider(type, id, config = {}) {
    const ProviderClass = this.providers[type];
    if (!ProviderClass) {
      throw new Error(`Unknown provider type: ${type}`);
    }
    return new ProviderClass(id, config);
  }
}

export const providerRegistry = new ProviderRegistry();
