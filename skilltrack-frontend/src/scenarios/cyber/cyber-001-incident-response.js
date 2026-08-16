/**
 * Cybersecurity Incident Response Scenario Pack
 * Mission: Contain a Live Intrusion
 */

export const CYBER_INCIDENT_RESPONSE = {
  id: "cyber-006",
  isHidden: true,
  title: "Contain a Live Intrusion",
  description: "An alert fired at 02:00. An unknown process is exfiltrating data on port 4444. You must identify the process, kill it, block the port, and document the incident.",
  environment: {
    provider: "ubuntu",
    config: {
      os: "Ubuntu 22.04 LTS",
      preInstalled: ["ufw", "netstat", "ps", "kill"],
      injectedProcess: { pid: 4821, name: "exfil.sh", port: 4444 }
    }
  },
  widgets: ["terminal", "logs"],
  objectives: [
    { id: "obj-identify", description: "Identify the suspicious process using netstat or ps", required: true },
    { id: "obj-kill", description: "Terminate the malicious process", required: true },
    { id: "obj-block", description: "Block port 4444 with ufw", required: true },
    { id: "obj-document", description: "Write an incident summary to /var/log/incident.txt", required: true }
  ],
  rules: [
    {
      id: "rule-identify",
      condition: { eq: ["$state.ubuntu.network.port4444", "DETECTED"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-identify" }
    },
    {
      id: "rule-process-killed",
      condition: { eq: ["$state.ubuntu.process.exfil", "KILLED"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-kill" }
    },
    {
      id: "rule-port-blocked",
      condition: { eq: ["$state.ubuntu.firewall.port4444", "BLOCKED"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-block" }
    },
    {
      id: "rule-documented",
      condition: { eq: ["$state.ubuntu.files.incident_log", "WRITTEN"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-document" }
    },
    {
      id: "rule-complete",
      condition: {
        and: [
          { eq: ["$state.ubuntu.process.exfil", "KILLED"] },
          { eq: ["$state.ubuntu.firewall.port4444", "BLOCKED"] }
        ]
      },
      action: "COMPLETE_MISSION"
    }
  ],
  scoring: { max: 100, penaltyPerMistake: 10, timeBonus: true },
  hints: [
    { trigger_after_seconds: 60, message: "Run 'netstat -tlnp' or 'ss -tlnp' to find which process owns port 4444." },
    { trigger_after_seconds: 120, message: "Once you have the PID, run 'kill -9 <PID>' to terminate it immediately." },
    { trigger_after_seconds: 180, message: "Block the port: 'sudo ufw deny 4444' then 'sudo ufw reload'." },
    { trigger_after_seconds: 240, message: "Write your report: 'echo \"Incident: Port 4444 exfil process killed at $(date)\" >> /var/log/incident.txt'" }
  ]
};
