export const EOD_SHUTDOWN_014_SCENARIO = {
  id: "EOD_SHUTDOWN_014",
  title: "Resource Shutdown Console",
  description: "Execute the End-of-Day shutdown procedure to safely power down non-essential resources and save costs.",
  environment: {
    provider: "ubuntu",
    config: {
      os: "Ubuntu 22.04 LTS",
      preInstalled: ["systemctl", "shutdown"]
    }
  },
  widgets: ["terminal"],
  objectives: [
    { id: "obj-stop-dev", description: "Stop the dev server `systemctl stop dev-server`", required: true, expectedCommand: "systemctl stop dev-server" },
    { id: "obj-stop-db", description: "Stop the non-prod database `systemctl stop nonprod-db`", required: true, expectedCommand: "systemctl stop nonprod-db" },
    { id: "obj-shutdown", description: "Shutdown the instance `shutdown +5`", required: true, expectedCommand: "shutdown +5" }
  ],
  rules: [
    {
      id: "rule-stop-dev",
      condition: { eq: ["$state.ubuntu.lastCommand", "systemctl stop dev-server"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-stop-dev" }
    },
    {
      id: "rule-stop-db",
      condition: { eq: ["$state.ubuntu.lastCommand", "systemctl stop nonprod-db"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-stop-db" }
    },
    {
      id: "rule-shutdown",
      condition: { eq: ["$state.ubuntu.lastCommand", "shutdown +5"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-shutdown" }
    },
    {
      id: "rule-complete",
      condition: {
        and: [
          { eq: ["$state.ubuntu.lastCommand", "shutdown +5"] }
        ]
      },
      action: "COMPLETE_MISSION"
    }
  ],
  scoring: { max: 100, penaltyPerMistake: 10, timeBonus: false },
  hints: [
    { trigger_after_seconds: 60, message: "Run 'systemctl stop dev-server'" },
    { trigger_after_seconds: 120, message: "Run 'shutdown +5' to schedule shutdown in 5 mins." }
  ]
};
