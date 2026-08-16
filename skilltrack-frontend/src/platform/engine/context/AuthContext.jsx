import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { sessionApi, usersApi } from "../../../api/usersApi";

// -----------------------------------------------------------------------------
// AUTH CONTEXT — user directory is real (spring-api's UserController /
// AuthController), but there's still no Spring Security / JWT session (see
// backend README §7). Login calls POST /api/auth/login to confirm the picked
// id is a real user, then just remembers that id client-side as "current".
// The resulting user.id is what gets used as the REAL `learnerId` in
// attemptsApi calls, so simulation runs are tied to a stable identity even
// though there's no server-side session yet.
// -----------------------------------------------------------------------------

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionApi.getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async ({ username, password }) => {
    const u = await sessionApi.setCurrentUser(username, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (draft) => {
    const created = await usersApi.create(draft);
    // After creation, log in using the same credentials
    // Username defaults to name without spaces (lowercase); password to what user entered or role+"123"
    const username = draft.username || (draft.name?.trim().toLowerCase().replace(/\s+/g, ""));
    const password = draft.password || (draft.role + "123");
    const u = await sessionApi.setCurrentUser(username, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await sessionApi.logout();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const fresh = await usersApi.getOne(user.id);
    setUser(fresh);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
