import { simulationEngine } from '../src/platform/engine/SimulationEngine.js';
import { stateManager } from '../src/platform/engine/StateManager.js';
import { eventBus } from '../src/platform/engine/EventBus.js';
import { LINUX_FIX_APACHE } from '../src/scenarios/linux/linux-001-fix-apache.js';

async function run() {
  console.log("=== Testing Phase 3: Full Mission Stack ===\n");

  // Subscribe to all events for trace output
  eventBus.subscribeAll(event => {
    console.log(`[EVENT] ${event.type} → ${event.source} : ${JSON.stringify(event.metadata)}`);
  });

  // 1. Load the Linux mission
  const mission = await simulationEngine.loadMission(LINUX_FIX_APACHE);
  console.log(`\nMission loaded: "${mission.title}"`);
  console.log(`State: ${stateManager.getCurrentState()}`);

  // 2. Begin execution
  simulationEngine.beginExecution();
  console.log(`State after beginning: ${stateManager.getCurrentState()}`);

  // 3. Execute commands and watch rules fire
  console.log("\n--- Learner runs wrong command first (records a mistake) ---");
  simulationEngine.recordMistake("Ran 'rm -rf /var/www' instead of checking status");

  console.log("\n--- Learner runs correct command ---");
  const output1 = await simulationEngine.executeCommand("systemctl start apache2");
  console.log(`Command output: ${output1}`);

  // 4. Check objectives
  console.log("\nObjectives:");
  simulationEngine.getObjectives().forEach(obj => {
    console.log(`  [${obj.completed ? 'x' : ' '}] ${obj.description}`);
  });

  console.log(`\nFinal State: ${stateManager.getCurrentState()}`);
  console.log(`Final Score: ${simulationEngine.getScore()}`);

  await simulationEngine.destroy();
  console.log("\nEngine destroyed cleanly.");
}

run().catch(console.error);
