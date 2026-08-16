export const APP_DEPLOY_013_SCENARIO = {
  id: "APP_DEPLOY_013",
  title: "Deployment Pipeline Terminal",
  description: "Deploy a new application version, verify it, and perform a rollback when an issue is detected.",
  environment: {
    provider: "ubuntu",
    config: {
      os: "Ubuntu 22.04 LTS",
      preInstalled: ["docker", "kubectl", "curl"]
    }
  },
  widgets: ["terminal"],
  objectives: [
    { id: "obj-build", description: "Build the Docker image `docker build -t app:v2.0.0 .`", required: true, expectedCommand: "docker build" },
    { id: "obj-push", description: "Push the Docker image `docker push app:v2.0.0`", required: true, expectedCommand: "docker push" },
    { id: "obj-deploy", description: "Deploy using script `./deploy.sh`", required: true, expectedCommand: "./deploy.sh" },
    { id: "obj-rollback", description: "Issue detected! Rollback using `kubectl rollout undo deployment/app`", required: true, expectedCommand: "kubectl rollout undo" }
  ],
  rules: [
    {
      id: "rule-build",
      condition: { eq: ["$state.ubuntu.lastCommand", "docker build -t app:v2.0.0 ."] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-build" }
    },
    {
      id: "rule-push",
      condition: { eq: ["$state.ubuntu.lastCommand", "docker push app:v2.0.0"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-push" }
    },
    {
      id: "rule-deploy",
      condition: { eq: ["$state.ubuntu.lastCommand", "./deploy.sh"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-deploy" }
    },
    {
      id: "rule-rollback",
      condition: { eq: ["$state.ubuntu.lastCommand", "kubectl rollout undo deployment/app"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-rollback" }
    },
    {
      id: "rule-complete",
      condition: {
        and: [
          { eq: ["$state.ubuntu.lastCommand", "kubectl rollout undo deployment/app"] }
        ]
      },
      action: "COMPLETE_MISSION"
    }
  ],
  scoring: { max: 100, penaltyPerMistake: 10, timeBonus: true },
  hints: [
    { trigger_after_seconds: 60, message: "Use 'docker build -t app:v2.0.0 .' to build the image." },
    { trigger_after_seconds: 120, message: "Use './deploy.sh' to deploy." }
  ]
};
