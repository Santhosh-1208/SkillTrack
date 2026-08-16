package com.skilltrack.api.controller;

import com.skilltrack.api.entity.Notification;
import com.skilltrack.api.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @Autowired
    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getUserNotifications(@RequestParam String userId) {
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable String id) {
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }

    @PutMapping("/readAll")
    public ResponseEntity<Map<String, String>> markAllAsRead(@RequestParam String userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @PostMapping
    public ResponseEntity<Notification> createNotification(@RequestBody Notification notification) {
        return ResponseEntity.ok(notificationService.create(notification));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable String id) {
        notificationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Admin acknowledges a trainer-action notification.
     * Body: { "adminName": "...", "adminId": "..." } (both optional)
     */
    @PostMapping("/{id}/acknowledge")
    public ResponseEntity<Notification> acknowledge(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String adminName = body != null ? body.getOrDefault("adminName", "") : "";
        return ResponseEntity.ok(notificationService.acknowledge(id, adminName));
    }
}
