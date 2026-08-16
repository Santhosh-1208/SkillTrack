// -----------------------------------------------------------------------------
// USERS API — REAL, wired to spring-api's UserController
// -----------------------------------------------------------------------------
// GET    /api/users?role=...     -> list users (optionally filtered by role)
// GET    /api/users/{id}         -> one user
// POST   /api/users              -> create (Registration, Add Learner, Add Trainer)
// PUT    /api/users/{id}         -> update (Edit Profile)
// DELETE /api/users/{id}         -> remove
//
// The backend seeds the same 5 demo accounts (learner-1/2/3, trainer-1,
// admin-1) that used to be hardcoded here as SEED_USERS — see
// UserSeeder.java — so Login / Admin Dashboard / Trainer Dashboard still
// have data to show on a fresh database.
// -----------------------------------------------------------------------------

import { apiClient } from "../lib/apiClient";
import { localStore } from "../lib/localStore";

export const usersApi = {
  list(role, trainerId) {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (trainerId) params.set("trainerId", trainerId);
    const qs = params.toString();
    return apiClient.get(qs ? `/api/users?${qs}` : "/api/users", { retry: true });
  },

  getOne(id) {
    return apiClient.get(`/api/users/${encodeURIComponent(id)}`, { retry: true });
  },

  create(userDraft) {
    return apiClient.post("/api/users", userDraft);
  },

  update(id, patch) {
    return apiClient.put(`/api/users/${encodeURIComponent(id)}`, patch);
  },

  remove(id) {
    return apiClient.del(`/api/users/${encodeURIComponent(id)}`);
  },

  trainerStats() {
    return apiClient.get("/api/users/trainer-stats").catch(() => ({}));
  },
};

// --- "Currently logged in" profile -----------------------------------------
// There is still no Spring Security / JWT session, so "who's logged in" is
// tracked client-side as just an id in localStorage. Login itself now hits
// POST /api/auth/login to confirm the id is real before remembering it —
// see AuthController.java.
const CURRENT_KEY = "currentUserId";

export const sessionApi = {
  getCurrentUser() {
    const id = localStore.read(CURRENT_KEY, null);
    if (!id) return Promise.resolve(null);
    return usersApi.getOne(id).catch(() => {
      sessionApi.logout();
      return null;
    });
  },
  async setCurrentUser(username, password) {
    const result = await apiClient.post("/api/auth/login", { username, password });
    localStorage.setItem("token", result.token);
    localStore.write(CURRENT_KEY, result.user.id);
    return result.user;
  },
  logout() {
    localStore.remove(CURRENT_KEY);
    localStorage.removeItem("token");
    return Promise.resolve(true);
  },
};
