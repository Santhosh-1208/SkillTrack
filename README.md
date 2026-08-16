# SkillTrack v1.0

SkillTrack is a comprehensive, simulation-based training and assessment platform designed to evaluate users through interactive scenarios (such as PPE compliance, CNC machine setup, electrical panel maintenance, and cybersecurity incident response). 

The application evaluates learners' decisions in real-time using a rule-based AI scoring engine and provides detailed, actionable feedback.

## 🏗️ Architecture

The project is divided into a modern React frontend and a robust Spring Cloud microservices backend.

### Frontend (`skilltrack-frontend/`)
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS, Radix UI (shadcn/ui), and `class-variance-authority`
- **3D Integrations:** Three.js and React Three Fiber (`@react-three/fiber`, `@react-three/drei`)
- **Routing & State:** React Router DOM
- **Data Visualization:** Recharts

### Backend (`skilltrack-backend/`)
- **Core Framework:** Java 17+ / Spring Boot Microservices
- **Service Discovery & Routing:** Netflix Eureka Server, Spring Cloud API Gateway
- **Microservices:**
  - `user-service`: User management and authentication.
  - `simulation-service`: Manages simulation configurations and catalogs.
  - `attempt-analytics-service`: Tracks user attempts, steps, and decisions.
  - `notification-service`: Handles platform notifications.
  - `sandbox-orchestrator`: Orchestrates the simulation execution.
- **AI Scoring Engine:** Python 3.10+ with FastAPI (`ai-scoring-service/`). Evaluates user decisions against rule-based criteria and generates scores/feedback.
- **Database:** MongoDB (Default: `localhost:27017/skilltrack`)

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Node.js** (v18+ recommended) and **npm**
- **Java 17+** and **Maven 3.8+**
- **Python 3.10+** and `pip`
- **MongoDB Compass / Server** running locally on `mongodb://localhost:27017`

## 🚀 Getting Started

### The Easy Way (Windows)

You can launch the entire stack using the provided batch script located at the root of the project:

```cmd
SkillTrackv1.0.bat
```
This script will automatically boot up the backend microservices (via `start-skilltrack.bat`) and start the Vite dev server for the frontend.

### Manual Setup & Execution

If you prefer to start the services manually or need to troubleshoot:

#### 1. Start the AI Scoring Service (Python)
```bash
cd skilltrack-backend/ai-scoring-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```
*Health check:* `http://localhost:8001/health`

#### 2. Start the Backend Microservices (Java)
```bash
cd skilltrack-backend
start-skilltrack.bat
```
*Note: This will boot the Eureka Server, API Gateway, and all dependent Spring Boot services. They connect to MongoDB to seed initial simulation configs from the `configs/` directory.*

#### 3. Start the Frontend (React)
```bash
cd skilltrack-frontend
npm install
npm run dev
```
The frontend will be accessible at `http://localhost:5173`.

## 📁 Project Structure

```text
skilltrack/
├── skilltrack-frontend/          # React Vite application
├── skilltrack-backend/           # Microservices & API
│   ├── ai-scoring-service/       # FastAPI Python scoring engine
│   ├── api-gateway/              # Spring Cloud Gateway
│   ├── eureka-server/            # Service Discovery
│   ├── user-service/             # User Management
│   ├── simulation-service/       # Scenario Data
│   ├── attempt-analytics-service/# Tracking & Analytics
│   ├── sandbox-orchestrator/     # Execution Environment
│   ├── notification-service/     # Alerts
│   └── configs/                  # Simulation JSON definitions
├── Materiels/                    # Assets and reference materials
├── logs/                         # Application execution logs
├── collections.json              # Postman/Insomnia API collections
└── SkillTrackv1.0.bat            # One-click startup script
```

## ⚙️ Configuration Notes

- **Simulations:** The core simulation configurations (PPE, Electrical, CNC, Cyber) live inside `skilltrack-backend/configs/`. The backend automatically seeds these into MongoDB on startup. Editing these JSON files and restarting the `simulation-service` updates the database automatically.
- **Scoring:** The scoring engine is intentionally rule-based, cross-referencing user actions against a Standard Operating Procedure (SOP) to ensure predictable, highly accurate feedback.
- **Database Connection:** If your MongoDB runs on a non-default port, update the `application.yml` configurations inside the respective Spring Boot microservices.

## 🧪 API Testing

You can interact with the backend APIs via the API Gateway (usually on port `8080` or `8082` depending on configuration). For a complete list of endpoints, you can import the `collections.json` file found in the root directory into your preferred API client.
