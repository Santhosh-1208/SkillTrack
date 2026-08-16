import { SimulationEngine } from './src/platform/engine/SimulationEngine.js';
import { APP_DEPLOY_013_SCENARIO } from './src/scenarios/linux/app-deploy-013.js';
import { eventBus } from './src/platform/engine/EventBus.js';

const engine = new SimulationEngine();

eventBus.subscribe("OBJECTIVE_UNLOCKED", (e) => {
  console.log("UNLOCKED:", e.metadata.objectiveId);
});

async function run() {
  await engine.loadMission(APP_DEPLOY_013_SCENARIO);
  engine.beginExecution();
  
  console.log("Executing docker build...");
  await engine.executeCommand("docker build -t app:v2.0.0 .");
  
  const objs = engine.mission.objectives;
  console.log("Objectives:", objs.map(o => ({ id: o.id, completed: o.completed })));
  
  process.exit(0);
}

run();
