export const UBUNTU_MGMT_011_SCENARIO = {
  id: "UBUNTU_MGMT_011",
  title: "Ubuntu Production Server Management",
  description: "Diagnose high CPU load on a production Ubuntu server, identify the failing service, resolve the issue, and document the incident.",
  environment: {
    provider: "ubuntu",
    config: {
      os: "Ubuntu 22.04 LTS",
      preInstalled: ["htop", "nginx", "curl"]
    }
  },
  widgets: ["terminal"],
  objectives: [
    { id: "obj-uptime", description: "Check system uptime and load average using `uptime`", required: true, expectedCommand: "uptime" },
    { id: "obj-top", description: "Identify the high CPU process using `top` or `htop`", required: true, expectedCommand: "top" },
    { id: "obj-status", description: "Check service status using `systemctl status nginx`", required: true, expectedCommand: "systemctl status nginx" },
    { id: "obj-restart", description: "Gracefully restart the failing service `systemctl restart nginx`", required: true, expectedCommand: "systemctl restart nginx" }
  ],
  rules: [
    {
      id: "rule-uptime",
      condition: { eq: ["$state.ubuntu.lastCommand", "uptime"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-uptime" }
    },
    {
      id: "rule-top",
      condition: {
        or: [
          { eq: ["$state.ubuntu.lastCommand", "top"] },
          { eq: ["$state.ubuntu.lastCommand", "htop"] }
        ]
      },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-top" }
    },
    {
      id: "rule-status",
      condition: { eq: ["$state.ubuntu.lastCommand", "systemctl status nginx"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-status" }
    },
    {
      id: "rule-restart",
      condition: { eq: ["$state.ubuntu.lastCommand", "systemctl restart nginx"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-restart" }
    },
    {
      id: "rule-complete",
      condition: {
        and: [
          { eq: ["$state.ubuntu.lastCommand", "systemctl restart nginx"] }
        ]
      },
      action: "COMPLETE_MISSION"
    }
  ],
  scoring: { max: 100, penaltyPerMistake: 10, timeBonus: true },
  hints: [
    { trigger_after_seconds: 60, message: "Type 'uptime' to check the server load." },
    { trigger_after_seconds: 120, message: "Type 'top' to find the process consuming CPU." }
  ]
};
