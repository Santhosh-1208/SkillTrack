/**
 * SQL Database Administration Scenario Pack
 * Mission: Fix a Broken Production Query
 */

export const SQL_FIX_QUERY = {
  id: "sql-001",
  isHidden: true,
  title: "Fix a Broken Production Query",
  description: "A slow query is causing production database timeouts. Identify the missing index, add it, and verify query performance improves.",
  environment: {
    provider: "sql",
    config: {
      engine: "PostgreSQL 15",
      database: "skilltrack_prod",
      tables: ["users", "attempts", "simulations"]
    }
  },
  widgets: ["terminal", "logs"],
  objectives: [
    { id: "obj-identify", description: "Run EXPLAIN ANALYZE on the slow query to identify the problem", required: true },
    { id: "obj-index", description: "Create a covering index on the attempts table", required: true },
    { id: "obj-verify", description: "Verify query execution time dropped below 100ms", required: true }
  ],
  rules: [
    {
      id: "rule-explain",
      condition: { eq: ["$state.sql.lastCommand", "EXPLAIN ANALYZE"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-identify" }
    },
    {
      id: "rule-index-created",
      condition: { eq: ["$state.sql.indexCreated", true] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-index" }
    },
    {
      id: "rule-fast-query",
      condition: { eq: ["$state.sql.queryTimeMs", "FAST"] },
      action: "UNLOCK_OBJECTIVE",
      metadata: { objectiveId: "obj-verify" }
    },
    {
      id: "rule-complete",
      condition: {
        and: [
          { eq: ["$state.sql.indexCreated", true] },
          { eq: ["$state.sql.queryTimeMs", "FAST"] }
        ]
      },
      action: "COMPLETE_MISSION"
    }
  ],
  scoring: { max: 100, penaltyPerMistake: 5, timeBonus: true },
  hints: [
    { trigger_after_seconds: 60, message: "Run: EXPLAIN ANALYZE SELECT * FROM attempts WHERE learner_id = 'learner-1' ORDER BY created_at DESC;" },
    { trigger_after_seconds: 150, message: "Create an index: CREATE INDEX CONCURRENTLY idx_attempts_learner ON attempts(learner_id, created_at DESC);" },
    { trigger_after_seconds: 240, message: "Re-run the EXPLAIN ANALYZE and check the 'Execution Time' — it should be under 100ms now." }
  ]
};
