/**
 * Git Collaboration Scenario Pack
 * Mission: Resolve a Merge Conflict
 */

export const GIT_MERGE_CONFLICT = {
  id: "git-001",
  title: "Resolve a Git Merge Conflict",
  description: "A teammate pushed changes to main while you were working. You now have a merge conflict in feature/login. Resolve it and push clean code.",
  environment: {
    provider: "git",
    config: {
      repo: "skilltrack-app",
      conflictedBranch: "feature/login",
      conflictFiles: ["src/auth/login.js"]
    }
  },
  widgets: ["terminal", "file-explorer"],
  objectives: [
    { id: "obj-fetch", description: "Fetch latest changes from remote", required: true, expectedCommand: "git fetch origin" },
    { id: "obj-merge", description: "Attempt to merge main into feature branch", required: true, expectedCommand: "git merge origin/main" },
    { id: "obj-resolve", description: "Resolve the merge conflict in login.js", required: true, expectedCommand: "echo 'export function login() { return true; }' > src/auth/login.js" },
    { id: "obj-push", description: "Push resolved code to remote", required: true, expectedCommand: "git push" }
  ],
  rules: [
    {
      id: "rule-fetch",
      condition: {
        or: [
          { eq: ["$state.git.lastCommand", "git fetch origin"] },
          { eq: ["$state.git.lastCommand", "git fetch"] },
          { eq: ["$state.git.fetched", true] }
        ]
      },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-fetch" }
    },
    {
      id: "rule-merge",
      condition: { eq: ["$state.git.mergeAttempted", true] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-merge" }
    },
    {
      id: "rule-conflict-resolved",
      condition: { eq: ["$state.git.conflictResolved", true] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-resolve" }
    },
    {
      id: "rule-pushed",
      condition: { eq: ["$state.git.pushed", true] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-push" }
    },
    {
      id: "rule-complete",
      condition: {
        and: [
          { eq: ["$state.git.conflictResolved", true] },
          { eq: ["$state.git.pushed", true] }
        ]
      },
      action: "COMPLETE_MISSION"
    }
  ],
  scoring: { max: 100, penaltyPerMistake: 10, timeBonus: false },
  hints: [
    { trigger_after_seconds: 60, message: "Run 'git fetch origin' to get the latest remote changes." },
    { trigger_after_seconds: 120, message: "Use 'git merge origin/main' to bring in the latest changes and expose the conflict." },
    { trigger_after_seconds: 200, message: "Open login.js and look for '<<<<<<' markers. Remove them and keep the correct code, then run 'git add src/auth/login.js'." }
  ]
};
