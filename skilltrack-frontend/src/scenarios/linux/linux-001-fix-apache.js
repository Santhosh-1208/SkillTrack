/**
 * Linux System Administration Scenario Pack
 * 
 * Mission: Fix Apache Server
 * Provider: Ubuntu
 * 
 * This is a pure data definition. No JavaScript logic here.
 * The SimOS engine reads this and drives the entire simulation.
 */

export const LINUX_FIX_APACHE = {
  id: "linux-001",
  isHidden: true,
  title: "Fix Apache Server",
  description: "Apache has gone down on a production server. Diagnose the issue, restart the service, and verify the website is back online.",
  environment: {
    provider: "ubuntu",
    config: {
      os: "Ubuntu 22.04 LTS",
      preInstalled: ["apache2", "ufw", "curl"]
    }
  },
  widgets: ["terminal", "logs"],
  objectives: [
    {
      id: "obj-check-status",
      description: "Check the status of the Apache service",
      required: true
    },
    {
      id: "obj-start-apache",
      description: "Start the Apache2 service",
      required: true
    },
    {
      id: "obj-verify-port",
      description: "Verify port 80 is open and the website responds",
      required: true
    }
  ],
  rules: [
    {
      id: "rule-apache-check",
      condition: {
        eq: ["$state.ubuntu.lastCommand", "systemctl status apache2"]
      },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-check-status" }
    },
    {
      id: "rule-apache-running",
      condition: {
        eq: ["$state.ubuntu.apache.status", "RUNNING"]
      },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-start-apache" }
    },
    {
      id: "rule-port-open",
      condition: {
        eq: ["$state.ubuntu.network.port80", "OPEN"]
      },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-verify-port" }
    },
    {
      id: "rule-mission-complete",
      condition: {
        and: [
          { eq: ["$state.ubuntu.apache.status", "RUNNING"] },
          { eq: ["$state.ubuntu.network.port80", "OPEN"] }
        ]
      },
      action: "COMPLETE_MISSION"
    }
  ],
  scoring: {
    max: 100,
    penaltyPerMistake: 5,
    timeBonus: true
  },
  hints: [
    {
      trigger_after_seconds: 60,
      message: "Try using 'systemctl status apache2' to check the current state of the service."
    },
    {
      trigger_after_seconds: 120,
      message: "Use 'sudo systemctl start apache2' to start the service."
    },
    {
      trigger_after_seconds: 180,
      message: "Use 'curl http://localhost' or check port 80 with 'ss -tlnp | grep 80' to verify."
    }
  ]
};
