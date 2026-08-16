// -----------------------------------------------------------------------------
// NOTIFICATIONS API — REAL Backend Persistence
// -----------------------------------------------------------------------------

import { apiClient } from "../lib/apiClient";

export const notificationsApi = {
  async listForUser(userId, role) {
    try {
      const remote = await apiClient.get(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      if (Array.isArray(remote)) {
        return remote.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    } catch {
      // Return empty if service fails
    }
    return [];
  },

  async markAsRead(notificationId) {
    return await apiClient.put(`/api/notifications/${notificationId}/read`);
  },

  async markAllAsRead(userId) {
    return await apiClient.put(`/api/notifications/readAll?userId=${encodeURIComponent(userId)}`);
  },

  // ── Assignment system (trainer assigns simulation to learner(s)) ──────────
  async createAssignment({ trainerId, trainerName, learnerIds, simulationId, simulationTitle, dueDate, message }) {
    // Create notifications for each learner via backend
    const promises = (learnerIds || []).map(learnerId => {
      return apiClient.post("/api/notifications", {
        userId: learnerId,
        role: "learner",
        category: "assignment",
        title: `New Assignment: ${simulationTitle}`,
        description: `${trainerName || "Your trainer"} has assigned you "${simulationTitle}"${dueDate ? ` — due ${new Date(dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}. ${message || ""}`.trim(),
        icon: "Zap",
        color: "#f59e0b",
        isRead: false
      }).catch(() => null);
    });

    await Promise.all(promises);
    return { status: "active" };
  },

  // ── Push a one-off notification (used by AI summary logic) ────────────────
  async pushNotification({ userId, role, category, title, description, icon, color }) {
    return await apiClient.post("/api/notifications", {
      userId,
      role,
      category,
      title,
      description,
      icon: icon || "Bell",
      color: color || "#3b82f6",
      isRead: false
    });
  },

  // ── Admin acknowledges a trainer-action notification ──────────────────────
  async acknowledge(notificationId, adminName) {
    return await apiClient.post(`/api/notifications/${notificationId}/acknowledge`, { adminName });
  },

  // ── Notify all admins when trainer creates or modifies a scenario/sim ─────
  async notifyAdminsOfTrainerAction({ adminIds, trainerId, trainerName, action, itemId, itemTitle }) {
    const promises = adminIds.map(adminId =>
      apiClient.post("/api/notifications", {
        userId: adminId,
        type: "trainer_action",
        trainerId,
        trainerName,
        relatedItemId: itemId,
        title: `Trainer ${action}: "${itemTitle}"`,
        description: `${trainerName} has ${action.toLowerCase()} scenario "${itemTitle}" (ID: ${itemId}). Please review and acknowledge.`,
        icon: "PenLine",
        color: "#f59e0b",
        isRead: false,
        acknowledged: false
      }).catch(() => null)
    );
    await Promise.all(promises);
  },
};

