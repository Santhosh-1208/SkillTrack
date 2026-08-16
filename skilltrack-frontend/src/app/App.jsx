// src/app/App.jsx (updated routes)
import { useEffect } from "react";
import { Sidebar } from "./components/shared/Sidebar";
import { useAuth } from "../platform/engine/context/AuthContext";
import { BrowserRouter, Routes, Route, Navigate, useNavigate as useRouterNavigate, useLocation, useParams } from "react-router-dom";
// Pages imports (unchanged)
import { DesignSystemPage } from "./pages/DesignSystemPage";
import { LoginPage } from "./pages/LoginPage";
import { RegistrationPage } from "./pages/RegistrationPage";
import { LearnerDashboardPage } from "./pages/LearnerDashboardPage";
import { SimulationsListPage } from "./pages/SimulationsListPage";
import { SimulationRunnerPage } from "./pages/SimulationRunnerPage";
import SimulationDetailPage from "./pages/SimulationDetailPage";
import { AIFeedbackPage } from "./pages/AIFeedbackPage";
import { ReportsPage } from "./pages/ReportsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TrainerDashboardPage } from "./pages/TrainerDashboardPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { ScenarioManagementPage } from "./pages/ScenarioManagementPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CertificatesPage } from "./pages/CertificatesPage";
import { AchievementsPage } from "./pages/AchievementsPage";
import { HomePage } from "./pages/HomePage";
import { ExploreTrainersPage } from "./pages/ExploreTrainersPage";

// Role based landing pages
const HOME_PAGE_BY_ROLE = {
  learner: "/learner-dashboard",
  trainer: "/trainer-dashboard",
  admin: "/admin-dashboard",
};

// Shared pages (available to all roles)
const SHARED_ROUTES = new Set([
  "/leaderboard",
  "/notifications",
  "/profile",
]);

// Role specific allowed routes (including learner‑only pages)
const ALLOWED_ROUTES_BY_ROLE = {
  learner: new Set([
    "/learner-dashboard",
    "/simulations",
    "/simulation/:id",
    "/simulation/:id/run",
    "/explore-trainers",
    "/ai-feedback",
    "/analytics",
    "/certificates",
    "/achievements",
    ...SHARED_ROUTES,
  ]),
  trainer: new Set([
    "/trainer-dashboard",
    "/scenario-management",
    "/analytics",
    "/ai-feedback",
    ...SHARED_ROUTES,
  ]),
  admin: new Set([
    "/admin-dashboard",
    "/scenario-management",
    "/analytics",
    ...SHARED_ROUTES,
  ]),
};

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const navigate = useRouterNavigate();

  // Guard: redirect unauthenticated users to login, otherwise send them to role home
  useEffect(() => {
    if (loading) return;
    const currentPath = window.location.pathname;
    // Public routes — no auth required
    const publicRoutes = ["/login", "/register", "/"];
    if (publicRoutes.includes(currentPath)) {
      // If logged-in user hits the home page, send them to their dashboard
      if (currentPath === "/" && user) {
        navigate(HOME_PAGE_BY_ROLE[user.role] ?? "/learner-dashboard");
      }
      return;
    }
    if (!user) {
      navigate("/login");
      return;
    }
    const allowed = ALLOWED_ROUTES_BY_ROLE[user.role] || new Set();
    const isAllowed = Array.from(allowed).some((r) => {
      if (r.includes(":")) {
        const prefix = r.split(":")[0];
        return currentPath.startsWith(prefix);
      }
      return r === currentPath;
    });
    if (!isAllowed) {
      navigate(HOME_PAGE_BY_ROLE[user.role] ?? "/learner-dashboard");
    }
  }, [loading, user, navigate]);

  // Helper to navigate from Sidebar and other components using logical ids
  const onNavigate = (pageId, opts = {}) => {
    const pathMap = {
      "learner-dashboard": "/learner-dashboard",
      "simulation": "/simulations",
      "simulation-detail": opts.id ? `/simulation/${opts.id}` : "/simulation",
      "simulation-runner": opts.id ? `/simulation/${opts.id}/run` : "/simulation-runner",
      "explore-trainers": "/explore-trainers",
      "ai-feedback": "/ai-feedback",
      "reports": "/analytics",
      "leaderboard": "/leaderboard",
      "notifications": "/notifications",
      "profile": "/profile",
      "trainer-dashboard": "/trainer-dashboard",
      "admin-dashboard": "/admin-dashboard",
      "scenario-management": "/scenario-management",
      "analytics": "/analytics",
      "certificates": "/certificates",
      "achievements": "/achievements",
    };
    const path = pathMap[pageId];
    if (path) navigate(path);
  };

  const location = useLocation();
  const currentRouteId = location.pathname.split('/')[1] || "learner-dashboard";

  return (
    <div className="flex h-screen" style={{ background: "#f5f7f8" }}>
      {user && <Sidebar current={currentRouteId} onChange={onNavigate} />}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/login" element={<LoginPage onNavigate={(page) => navigate(`/${page}`)} />} />
          <Route path="/register" element={<RegistrationPage onNavigate={(page) => navigate(`/${page}`)} />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/learner-dashboard" element={<LearnerDashboardPage onNavigate={onNavigate} />} />
          <Route path="/simulations" element={<SimulationsListPage onNavigate={onNavigate} />} />
          <Route path="/simulation/:id" element={<SimulationDetailPage onNavigate={onNavigate} />} />
          {/* New route for the runner – extracts the id and passes it to the component */}
          <Route
            path="/simulation/:id/run"
            element={<WrappedRunner onNavigate={onNavigate} />}
          />
          <Route path="/explore-trainers" element={<ExploreTrainersPage onNavigate={onNavigate} />} />
          <Route path="/ai-feedback" element={<AIFeedbackPage onNavigate={onNavigate} />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage onNavigate={onNavigate} />} />
          <Route path="/trainer-dashboard" element={<TrainerDashboardPage />} />
          <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
          <Route path="/scenario-management" element={<ScenarioManagementPage />} />
          <Route path="/analytics" element={user?.role === 'learner' ? <ReportsPage onNavigate={onNavigate} /> : <AnalyticsPage />} />
          <Route path="/certificates" element={<CertificatesPage onNavigate={onNavigate} />} />
          <Route path="/achievements" element={<AchievementsPage onNavigate={onNavigate} />} />
        </Routes>
      </main>
    </div>
  );
}

// Helper component to inject the simulationId param into SimulationRunnerPage
function WrappedRunner({ onNavigate }) {
  const { id } = useParams();
  return <SimulationRunnerPage simulationId={id} onNavigate={onNavigate} />;
}
