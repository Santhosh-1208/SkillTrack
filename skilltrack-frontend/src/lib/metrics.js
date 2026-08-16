import { apiClient } from './apiClient';

/**
 * Sends an analytics event to the backend.
 * If the backend endpoint does not exist yet, it will be a no-op (fails silently).
 *
 * @param {string} name - Event name, e.g. "simulation_start"
 * @param {object} payload - Additional data for the event
 */
export async function trackEvent(name, payload = {}) {
  try {
    // We use /api/telemetry instead of /api/analytics to avoid adblocker ERR_BLOCKED_BY_CLIENT
    // Temporarily commented out to avoid native browser CORS/404 errors since the backend 
    // endpoint isn't fully implemented yet.
    /*
    await apiClient.post('/api/telemetry/events', {
      eventName: name,
      payload,
      timestamp: new Date().toISOString(),
    });
    */
  } catch (e) {
    // In development we don't want analytics failures to break the UI
    // console.warn('Telemetry event failed (likely no backend endpoint yet):', name, e.message);
  }
}
