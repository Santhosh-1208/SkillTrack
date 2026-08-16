package com.skilltrack.api.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;
    private String userId;
    private String title;
    private String description;
    private LocalDateTime createdAt;
    private String icon;
    private String color;
    private boolean isRead;

    // Extended fields for trainer→admin workflow
    private String type;           // e.g. "trainer_action", "admin_acknowledgement", "assignment"
    private String trainerId;      // id of the trainer who triggered the action
    private String trainerName;    // name of the trainer (for display without extra lookup)
    private String relatedItemId;  // scenario/simulation id that was acted on
    private boolean acknowledged;  // admin has acknowledged this

    public Notification() {
    }

    public Notification(String userId, String title, String description, LocalDateTime createdAt, String icon, String color, boolean isRead) {
        this.userId = userId;
        this.title = title;
        this.description = description;
        this.createdAt = createdAt;
        this.icon = icon;
        this.color = color;
        this.isRead = isRead;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTrainerId() { return trainerId; }
    public void setTrainerId(String trainerId) { this.trainerId = trainerId; }
    public String getTrainerName() { return trainerName; }
    public void setTrainerName(String trainerName) { this.trainerName = trainerName; }
    public String getRelatedItemId() { return relatedItemId; }
    public void setRelatedItemId(String relatedItemId) { this.relatedItemId = relatedItemId; }
    public boolean isAcknowledged() { return acknowledged; }
    public void setAcknowledged(boolean acknowledged) { this.acknowledged = acknowledged; }
}
