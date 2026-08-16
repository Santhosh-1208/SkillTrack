package com.skilltrack.api.service;

import com.skilltrack.api.entity.Notification;
import com.skilltrack.api.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Autowired
    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public List<Notification> getNotificationsForUser(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Notification markAsRead(String notificationId) {
        return notificationRepository.findById(notificationId).map(notification -> {
            notification.setRead(true);
            return notificationRepository.save(notification);
        }).orElseThrow(() -> new RuntimeException("Notification not found"));
    }

    public void markAllAsRead(String userId) {
        List<Notification> unread = notificationRepository.findByUserId(userId).stream()
                .filter(n -> !n.isRead())
                .toList();
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    public Notification create(Notification notification) {
        if (notification.getCreatedAt() == null) {
            notification.setCreatedAt(LocalDateTime.now());
        }
        return notificationRepository.save(notification);
    }

    public void delete(String id) {
        notificationRepository.deleteById(id);
    }

    /**
     * Admin acknowledges a trainer-action notification.
     * 1. Marks the admin's notification as acknowledged + read.
     * 2. Creates a new notification for the trainer confirming the admin saw it.
     */
    public Notification acknowledge(String notificationId, String adminName) {
        Notification adminNotif = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));

        // Mark the admin's notification as acknowledged and read
        adminNotif.setAcknowledged(true);
        adminNotif.setRead(true);
        notificationRepository.save(adminNotif);

        // Only send back-notification if we know who the trainer is
        String trainerId = adminNotif.getTrainerId();
        if (trainerId != null && !trainerId.isBlank()) {
            Notification trainerNotif = new Notification();
            trainerNotif.setUserId(trainerId);
            trainerNotif.setType("admin_acknowledgement");
            trainerNotif.setTitle("Admin Acknowledged Your Change");
            String itemRef = adminNotif.getRelatedItemId() != null
                    ? " on \"" + adminNotif.getRelatedItemId() + "\""
                    : "";
            trainerNotif.setDescription(
                    (adminName != null && !adminName.isBlank() ? adminName : "Admin")
                    + " has reviewed and acknowledged your recent update" + itemRef + ".");
            trainerNotif.setIcon("CheckCircle");
            trainerNotif.setColor("#22c55e");
            trainerNotif.setRead(false);
            trainerNotif.setCreatedAt(LocalDateTime.now());
            trainerNotif.setRelatedItemId(adminNotif.getRelatedItemId());
            notificationRepository.save(trainerNotif);
        }

        return adminNotif;
    }
}
