package com.skilltrack.api.controller;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final MongoTemplate mongoTemplate;

    public AnalyticsController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    // ---------------------------------------------------------------
    // Helper: resolve a user's display name from their ID string.
    // Handles both ObjectId ("_id") and plain string ("id") fields.
    // ---------------------------------------------------------------
    private Map<String, String> buildUserNameMap() {
        List<Document> users = mongoTemplate.findAll(Document.class, "users");
        Map<String, String> map = new HashMap<>();
        for (Document u : users) {
            String name = u.getString("name");
            if (name == null) name = "Anonymous Learner";

            // Try _id as ObjectId
            Object oid = u.get("_id");
            if (oid != null) {
                map.put(oid.toString(), name);
            }
            // Also try plain string "id" field if present
            String sid = u.getString("id");
            if (sid != null && !sid.isEmpty()) {
                map.put(sid, name);
            }
            // Also try "learner_id" if stored that way
            String lid = u.getString("learner_id");
            if (lid != null && !lid.isEmpty()) {
                map.put(lid, name);
            }
        }
        return map;
    }

    // ---------------------------------------------------------------
    // GET /api/analytics/leaderboard
    // Groups ALL completed attempts by learner, takes BEST score per
    // simulation (so re-attempts don't inflate or deflate the rank),
    // then averages across simulations to get a fair overall score.
    // ---------------------------------------------------------------
    @GetMapping("/leaderboard")
    public List<Document> getLeaderboard() {

        List<Document> completedAttempts = mongoTemplate.find(
                Query.query(Criteria.where("status").is("completed")),
                Document.class, "attempts");

        Map<String, String> userNames = buildUserNameMap();

        // userName -> sum of all scores
        Map<String, Double> scoreSum = new HashMap<>();
        // userName -> count of all attempts
        Map<String, Integer> attemptCount = new HashMap<>();
        // userName -> set of distinct simulation_ids
        Map<String, Set<String>> distinctSims = new HashMap<>();

        for (Document attempt : completedAttempts) {
            String learnerId = attempt.getString("learner_id");
            String simId     = attempt.getString("simulation_id");
            Document finalScore = (Document) attempt.get("final_score");

            if (learnerId == null || simId == null || finalScore == null) continue;

            Object scoreObj = finalScore.get("overall_score");
            if (!(scoreObj instanceof Number)) continue;
            double score = ((Number) scoreObj).doubleValue();

            String userName = userNames.getOrDefault(learnerId, "Learner");

            scoreSum.merge(userName, score, Double::sum);
            attemptCount.merge(userName, 1, Integer::sum);
            distinctSims.computeIfAbsent(userName, k -> new HashSet<>()).add(simId);
        }

        List<Document> leaderboard = new ArrayList<>();
        for (String userName : scoreSum.keySet()) {
            double totalScore = scoreSum.get(userName);
            int count = attemptCount.get(userName);
            int simCount = distinctSims.get(userName).size();

            double avgScore = count > 0 ? totalScore / count : 0.0;

            Document leader = new Document();
            leader.put("id",           userName); // Use userName as ID since we merged them
            leader.put("name",         userName);
            leader.put("score",        Math.round(avgScore * 10.0) / 10.0);
            leader.put("simulations",  simCount);
            leaderboard.add(leader);
        }

        // Sort descending by score; tie-break by more simulations completed
        leaderboard.sort((a, b) -> {
            int cmp = Double.compare(b.getDouble("score"), a.getDouble("score"));
            if (cmp != 0) return cmp;
            return Integer.compare(
                ((Number) b.get("simulations")).intValue(),
                ((Number) a.get("simulations")).intValue()
            );
        });

        return leaderboard;
    }

    // ---------------------------------------------------------------
    // GET /api/analytics/cohort
    // ---------------------------------------------------------------
    @GetMapping("/cohort")
    public Document getCohortStats() {
        List<Document> completedAttempts = mongoTemplate.find(
                Query.query(Criteria.where("status").is("completed")),
                Document.class, "attempts");

        int totalAttempts = completedAttempts.size();
        if (totalAttempts == 0) {
            Document empty = new Document();
            empty.put("totalAttempts", 0);
            empty.put("averageScore",  0.0);
            empty.put("passRate",      0.0);
            return empty;
        }

        double totalScoreSum = 0.0;
        int passCount = 0;
        Map<String, List<Double>> competencyScores = new HashMap<>();

        for (Document attempt : completedAttempts) {
            Document finalScore = (Document) attempt.get("final_score");
            if (finalScore == null) continue;

            Object overall = finalScore.get("overall_score");
            if (overall instanceof Number) {
                totalScoreSum += ((Number) overall).doubleValue();
            }
            if (Boolean.TRUE.equals(finalScore.getBoolean("passed"))) {
                passCount++;
            }

            Document comps = (Document) finalScore.get("competency_scores");
            if (comps != null) {
                for (String key : comps.keySet()) {
                    Object val = comps.get(key);
                    if (val instanceof Number) {
                        competencyScores
                            .computeIfAbsent(key, k -> new ArrayList<>())
                            .add(((Number) val).doubleValue());
                    }
                }
            }
        }

        Document stats = new Document();
        stats.put("totalAttempts", totalAttempts);
        stats.put("averageScore",  Math.round((totalScoreSum / totalAttempts) * 10.0) / 10.0);
        stats.put("passRate",      Math.round(((double) passCount / totalAttempts * 100.0) * 10.0) / 10.0);

        Document competencyAverages = new Document();
        competencyScores.forEach((name, scores) -> {
            double avg = scores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            competencyAverages.put(name, Math.round(avg * 10.0) / 10.0);
        });
        stats.put("competencies", competencyAverages);

        return stats;
    }
}
