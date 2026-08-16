// Thin fetch wrapper around the real SkillTrack Spring Boot API.
// Every function in src/api/*Api.js that talks to a REAL backend endpoint
// (simulations, attempts) goes through here.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// Retry a function up to `maxAttempts` times with exponential backoff.
// Only retries on 500/503 (gateway cold-start) or network errors (status 0).
async function withRetry(fn, maxAttempts = 3, baseDelayMs = 800) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable = err.status === 0 || err.status === 500 || err.status === 503;
      if (!isRetryable || attempt === maxAttempts) throw err;
      // Exponential backoff: 800ms, 1600ms, 3200ms…
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
    }
  }
  throw lastErr;
}

async function request(path, options = {}, retry = false) {
  const url = `${BASE_URL}${path}`;
  const token = localStorage.getItem("token");

  const doFetch = async () => {
    let response;
    try {
      response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
        ...options,
      });
    } catch (networkErr) {
      throw new ApiError(
        `Could not reach the SkillTrack API at ${url}. Is the Spring Boot app running on ${BASE_URL}?`,
        0,
        null,
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      const message =
        (body && (body.message || body.error)) ||
        `Request to ${path} failed with status ${response.status}`;
      throw new ApiError(message, response.status, body);
    }
    return body;
  };

  // Startup-critical GET requests use retry (e.g. getCurrentUser, list calls)
  if (retry) {
    return withRetry(doFetch);
  }
  return doFetch();
}

export const apiClient = {
  get: (path, { retry = false } = {}) => request(path, { method: "GET" }, retry),
  post: (path, data) =>
    request(path, { method: "POST", body: data != null ? JSON.stringify(data) : undefined }),
  put: (path, data) =>
    request(path, { method: "PUT", body: data != null ? JSON.stringify(data) : undefined }),
  del: (path) => request(path, { method: "DELETE" }),
};

export { BASE_URL };
