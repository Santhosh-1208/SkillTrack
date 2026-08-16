# SkillTrack Backend

Two services + a shared config folder, matching the SRS's tech stack:

```
skilltrack-backend/
├── configs/                          # 4 simulation JSONs — the engine's only "content"
├── simulation-config-schema.json     # shape every simulation JSON must follow
├── attempt-log-schema.json           # shape every attempt record follows
├── spring-api/                       # Spring Boot: simulations + attempts REST API
└── ai-scoring-service/               # Python FastAPI: rule-based scoring engine
```

This sits inside your `skilltrack/` folder next to `skilltrack-frontend/`.

## 1. Prerequisites

- Java 17+, Maven 3.8+
- Python 3.10+
- MongoDB running locally (you said Compass/local Mongo is already up) at `mongodb://localhost:27017`

If your Mongo isn't at that default URI, edit `spring-api/src/main/resources/application.yml`:
```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/skilltrack   # <- change this line if needed
```

## 2. Run the AI scoring service first

```bash
cd ai-scoring-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```
Check it's alive: `curl http://localhost:8001/health` → `{"status":"ok"}`

## 3. Run the Spring Boot API

```bash
cd spring-api
mvn spring-boot:run
```

On startup, watch the logs for lines like:
```
Inserted simulation config: PPE_COMPLIANCE_001 (ppe-compliance.json)
Inserted simulation config: ELECTRICAL_PANEL_002 (electrical-panel-maintenance.json)
Inserted simulation config: CNC_SETUP_003 (cnc-machine-setup.json)
Inserted simulation config: CYBER_INCIDENT_004 (cybersecurity-incident-response.json)
Simulation config seeding complete. Inserted: 4, Updated: 0, Total in DB: 4
```
Open Compass and check the `skilltrack` database → `simulations` collection — you should see all 4 documents. If you re-run the app after editing a config JSON, it upserts automatically (delete+reinsert by `simulation_id`), so editing a file and restarting is enough to pick up changes.

The API runs on `http://localhost:8080`.

## 4. Test it with curl / Postman before touching the frontend

**List simulations** (powers the dashboard):
```bash
curl http://localhost:8080/api/simulations
```

**Get one simulation** (powers the Simulation Runner — answer keys are stripped, see §6):
```bash
curl http://localhost:8080/api/simulations/PPE_COMPLIANCE_001
```

**Start an attempt:**
```bash
curl -X POST http://localhost:8080/api/attempts/start \
  -H "Content-Type: application/json" \
  -d '{"simulationId": "PPE_COMPLIANCE_001", "learnerId": "learner-1"}'
```
Copy the `attempt_id` from the response for the next calls.

**Log a completed step:**
```bash
curl -X POST http://localhost:8080/api/attempts/<attempt_id>/actions \
  -H "Content-Type: application/json" \
  -d '{"stepId": "PPE_S1", "actionType": "step_completed"}'
```
Repeat for each step (`PPE_S2` … `PPE_S8`).

**Log a decision:**
```bash
curl -X POST http://localhost:8080/api/attempts/<attempt_id>/decisions \
  -H "Content-Type: application/json" \
  -d '{"decisionId": "PPE_D1", "optionIdChosen": "B", "timeTakenSeconds": 5}'
```

**Complete the attempt (this is what triggers scoring):**
```bash
curl -X POST http://localhost:8080/api/attempts/<attempt_id>/complete
```
The response is exactly what the AI Feedback page needs: `overall_score`, `passed`, `mistakes_made`, `competency_scores`, `ai_explanations`, `recommended_next_simulations`.

**List a learner's attempts** (powers the Reports page):
```bash
curl "http://localhost:8080/api/attempts?learnerId=learner-1"
```

**List users** (powers Login, Admin Dashboard, Trainer Dashboard):
```bash
curl http://localhost:8080/api/users
curl "http://localhost:8080/api/users?role=learner"
```

**Log in as a seeded demo account:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id": "learner-1"}'
```

**Register a new learner:**
```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"role": "learner", "name": "Test User", "email": "test@example.com"}'
```

## 5. Then, and only then, wire the frontend

Replace the mock `useState` data in `App.jsx` with `fetch()` calls to `http://localhost:8080/api/...`. CORS is already configured for the Vite dev server (`http://localhost:5173`) in `CorsConfig.java` — if your frontend runs on a different port, add it there.

## 6. Design notes worth knowing

- **Answer keys are stripped from the learner-facing endpoint.** `GET /api/simulations/{id}` removes `is_correct`, `consequence`, and `mistake_id` from decision options, and drops `possible_mistakes` entirely — because that response is visible in the learner's browser network tab. The *internal* full config (with answer key) is only ever sent server-to-server, from Spring Boot to the Python scoring service, never to the browser.
- **Scoring is rule-based, not ML** — by design (see the earlier project discussion: a well-designed rule engine that diffs actions against the SOP looks "AI" to reviewers and is far faster to get right than real ML). `ai-scoring-service/main.py` is the whole engine; swapping in a real model later means changing this one file's internals, not its `/score` contract.
- **One shared engine, four simulations as data** — nothing in either service references PPE/Electrical/CNC/Cybersecurity by name. Adding simulation #5 means adding a JSON file to `configs/` and restarting Spring Boot; no code changes.
- **Known simplification:** if a simulation's config only has *one* catalog entry for a given mistake `type` (e.g. one `"skipped_step"` entry), skipping two *different* steps of that type both get logged as the same `mistake_id` with the same explanation text — because the engine falls back to "the" entry for that type when there's no more specific one. This is a content-modeling limitation (worth mentioning if you want more granular feedback per step), not a scoring bug — verified in testing that penalties still apply correctly for each occurrence.
- **Testing note:** I validated the scoring engine directly (in-process, bypassing HTTP) against 3 scenarios — a perfect PPE run (scores 100, no mistakes), a messy PPE run (correctly flags a skipped safety-critical step *and* a wrong decision, using their distinct mistake IDs), and an Electrical Panel run severe enough to drop Safety Awareness below the recommendation threshold (correctly triggers a cross-simulation recommendation back to PPE). I could not run a live Maven compile in this environment because Maven Central isn't reachable from this sandbox's network allow-list — run `mvn compile` yourself as your first step; the Java was manually checked for brace balance and that every method call matches its actual signature, but that's not a substitute for a real compiler pass.

## 7. What's not built yet (by design, deferred earlier)

- Spring Security / JWT sessions — `POST /api/auth/login` and the `/api/users`
  CRUD endpoints are real now (backed by Mongo, seeded with the same 5 demo
  accounts the frontend used to hardcode into localStorage — see
  `UserSeeder.java`), but there's still no password check, token, or
  server-side session. Anyone can call any endpoint with any id/learnerId.
- Trainer/Admin Scenario Management + Analytics endpoints — simulations are
  still read-only over the API (`GET /api/simulations`, `GET
  /api/simulations/{id}`); adding one is still "drop a JSON file in
  `configs/` and restart", not a POST. The frontend's Scenario Management
  page layers its own create/edit/delete on top of the real list using a
  localStorage overlay (see `src/api/scenariosApi.js`) until that exists.
- Real ML — current scoring is rule-based, which is the intended v1
