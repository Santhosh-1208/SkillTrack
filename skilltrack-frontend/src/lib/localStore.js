// -----------------------------------------------------------------------------
// LOCAL-ONLY DATA STORE
// -----------------------------------------------------------------------------
// Users/auth now go through the real backend (see src/api/usersApi.js and
// spring-api's UserController/AuthController). What's still local-only:
//   - The scenario overlay (create/edit/delete) in src/api/scenariosApi.js,
//     since spring-api still only exposes read endpoints for simulations
//     (see backend README §7 — adding a scenario is still "drop a JSON file
//     in configs/ and restart", not a POST).
//   - The "currently logged in" user id itself (there's no server session /
//     JWT yet — the id is just remembered client-side and re-validated
//     against the real user directory on each login).
// Each function below is written so that swapping any remaining piece for a
// real fetch() call later is a one-line change — see the comments in src/api/*.
// -----------------------------------------------------------------------------

const NAMESPACE = "skilltrack.local.";

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(NAMESPACE + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  window.localStorage.setItem(NAMESPACE + key, JSON.stringify(value));
  return value;
}

export const localStore = {
  read,
  write,
  remove(key) {
    window.localStorage.removeItem(NAMESPACE + key);
  },
};

export function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
