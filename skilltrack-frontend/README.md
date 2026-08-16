# SkillTrack Frontend

This is the rebuilt multi-file React + Vite frontend for SkillTrack. It preserves the original mock UI while wiring pages to the real backend wherever endpoints exist, and uses local state/localStorage for the remaining features that do not yet have backend support.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8080
```

3. Start the frontend:

```bash
npm run dev
```

The Spring Boot API is expected at `http://localhost:8080`, and the backend currently allows CORS from `http://localhost:5173`.

## Real vs local pages

### Real backend data

- `Learner Dashboard`: real simulations + learner attempts
- `Simulations`: real simulation list from `/api/simulations`
- `Simulation Runner`: starts attempts, logs actions/decisions, completes attempts
- `AI Feedback`: real final scoring, competency scores, explanations, mistakes, recommendations
- `Reports`: real learner attempt history and charts based on completed attempts

### Local-only or hybrid data

- `Login` and `Registration`: local demo user/session flow until auth endpoints exist
- `Profile`: edits saved locally for learner, trainer, and admin users
- `Trainer Dashboard`: learner roster + add learner form stored locally
- `Admin Dashboard`: role counts + add learner/trainer forms stored locally
- `Scenario Management`: hybrid page
  - reads backend simulations when available
  - stores add/edit/delete changes locally as overlays
- `Leaderboard`: demo data with local notice
- `Notifications`: local component state with local notice
- `Analytics`: mock charts with local notice

## Backend endpoints currently used

The frontend uses these backend APIs today:

- `GET /api/simulations`
- `GET /api/simulations/{id}`
- `POST /api/attempts/start`
- `POST /api/attempts/{attemptId}/actions`
- `POST /api/attempts/{attemptId}/decisions`
- `POST /api/attempts/{attemptId}/hints`
- `POST /api/attempts/{attemptId}/complete`
- `GET /api/attempts/{attemptId}`
- `GET /api/attempts?learnerId=...`

## Backend setup

See the backend project's README for the complete backend run instructions, including:

- Spring Boot API
- FastAPI AI scoring service
- MongoDB
- simulation config files

That backend README is the source of truth for running the full SkillTrack stack.
