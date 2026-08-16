import { stateManager } from '../src/platform/engine/StateManager.js';
import { ruleEngine } from '../src/platform/engine/RuleEngine.js';
import { providerRegistry } from '../src/platform/providers/ProviderRegistry.js';

async function run() {
  console.log("=== Testing Phase 2 Core Mechanics ===");
  
  console.log(`Initial State: ${stateManager.getCurrentState()}`);
  stateManager.transition('BRIEFING');
  console.log(`State after valid transition: ${stateManager.getCurrentState()}`);
  
  // Test invalid transition
  stateManager.transition('SUCCESS');
  console.log(`State after invalid transition (should still be BRIEFING): ${stateManager.getCurrentState()}`);

  const provider = providerRegistry.createProvider('ubuntu', 'ubuntu-1');
  await provider.init();
  
  const rules = [
    {
      condition: {
        and: [
          { eq: ["$state.ubuntu.apache.status", "RUNNING"] },
          { eq: ["$state.ubuntu.network.port80", "OPEN"] }
        ]
      },
      action: "COMPLETE_MISSION"
    }
  ];
  
  ruleEngine.loadRules(rules);
  
  console.log("State before command:", await provider.getState());
  ruleEngine.evaluate({ ubuntu: await provider.getState() });
  
  await provider.executeCommand("systemctl start apache2");
  console.log("State after command:", await provider.getState());
  
  ruleEngine.evaluate({ ubuntu: await provider.getState() });
  
  console.log("Test finished.");
}

run();
