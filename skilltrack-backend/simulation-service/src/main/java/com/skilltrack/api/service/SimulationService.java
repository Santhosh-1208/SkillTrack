package com.skilltrack.api.service;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Reads simulation configs seeded into the "simulations" collection by ConfigSeeder.
 *
 * Two read paths on purpose:
 *  - getForLearner(id): strips is_correct / consequence / mistake_id from decision
 *    options and removes the possible_mistakes catalog entirely, so a learner
 *    inspecting the network tab can't read the answer key straight out of the
 *    simulation-runner API response.
 *  - getInternal(id): full, unmodified document - only used server-side when
 *    handing the config to the AI scoring service, which needs the answer key
 *    to actually grade the attempt.
 */
@Service
public class SimulationService {

    private final MongoTemplate mongoTemplate;
    private static final String COLLECTION = "simulations";

    public SimulationService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    /** Lightweight list for dashboard / simulation-lab pages: no step/decision detail needed. */
    public List<Document> listSummaries() {
        List<Document> all = mongoTemplate.find(Query.query(Criteria.where("isHidden").ne(true)), Document.class, COLLECTION);
        return mapToSummaries(all);
    }

    public List<Document> listSummariesByCategory(String category) {
        List<Document> all = mongoTemplate.find(
                Query.query(Criteria.where("category").is(category).andOperator(Criteria.where("isHidden").ne(true))),
                Document.class, COLLECTION);
        return mapToSummaries(all);
    }

    public List<Document> getUnattendedSimulations(String date) {
        // Since attempts are not available in this microservice without REST calls,
        // we'll just return a subset of simulations for now. The frontend usually computes this.
        List<Document> all = mongoTemplate.find(Query.query(Criteria.where("isHidden").ne(true)), Document.class, COLLECTION);
        return mapToSummaries(all);
    }

    private List<Document> mapToSummaries(List<Document> all) {
        List<Document> summaries = new ArrayList<>();
        for (Document doc : all) {
            Document summary = new Document();
            summary.put("simulation_id", doc.get("simulation_id"));
            summary.put("title", doc.get("title"));
            summary.put("branch", doc.get("branch"));
            summary.put("category", doc.get("category"));
            summary.put("level", doc.get("level"));
            summary.put("interaction_pattern", doc.get("interaction_pattern"));
            summary.put("goal", doc.get("goal"));
            summary.put("prerequisites", doc.get("prerequisites"));
            summary.put("time_limit_seconds", doc.get("time_limit_seconds"));
            summary.put("sop_steps", doc.get("sop_steps"));
            summaries.add(summary);
        }
        return summaries;
    }

    public Document getInternal(String simulationId) {
        Document doc = mongoTemplate.findOne(
                Query.query(Criteria.where("simulation_id").is(simulationId)),
                Document.class, COLLECTION);
        if (doc == null) {
            throw new NoSuchElementException("No simulation found with simulation_id=" + simulationId);
        }
        doc.remove("_id");
        return doc;
    }

    @SuppressWarnings("unchecked")
    public Document getForLearner(String simulationId) {
        Document doc = getInternal(simulationId);
        Document safe = Document.parse(doc.toJson());

        // Strip answer-key fields from decision_points
        Object dpObj = safe.get("decision_points");
        if (dpObj instanceof List) {
            for (Object dpo : (List<?>) dpObj) {
                if (!(dpo instanceof Document)) continue;
                Document dp = (Document) dpo;
                Object optsObj = dp.get("options");
                if (optsObj instanceof List) {
                    for (Object oo : (List<?>) optsObj) {
                        if (!(oo instanceof Document)) continue;
                        Document opt = (Document) oo;
                        opt.remove("is_correct");
                        opt.remove("consequence");
                        opt.remove("mistake_id");
                    }
                }
            }
        }

        // The mistake catalog itself is pure answer-key content - never send it to the player
        safe.remove("possible_mistakes");

        return safe;
    }

    public Document create(Document doc) {
        String simulationId = doc.getString("simulation_id");
        if (simulationId == null || simulationId.isBlank()) {
            throw new IllegalArgumentException("simulation_id is required");
        }
        if (mongoTemplate.exists(Query.query(Criteria.where("simulation_id").is(simulationId)), COLLECTION)) {
            throw new IllegalArgumentException("Simulation with id \"" + simulationId + "\" already exists.");
        }
        mongoTemplate.insert(doc, COLLECTION);
        doc.remove("_id");
        return doc;
    }

    public Document update(String simulationId, Document patch) {
        getInternal(simulationId); // Verify existence
        Query query = Query.query(Criteria.where("simulation_id").is(simulationId));
        
        Update update = new Update();
        patch.forEach((key, value) -> {
            if ("_id".equals(key) || "simulation_id".equals(key)) {
                return;
            }
            update.set(key, value);
        });

        mongoTemplate.updateFirst(query, update, COLLECTION);
        return getInternal(simulationId);
    }

    public void delete(String simulationId) {
        getInternal(simulationId); // Verify existence
        mongoTemplate.remove(Query.query(Criteria.where("simulation_id").is(simulationId)), COLLECTION);
    }
}
