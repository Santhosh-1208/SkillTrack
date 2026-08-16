package com.skilltrack.api.controller;

import com.skilltrack.api.service.UserService;
import org.bson.Document;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST surface for UserService. Matches src/api/usersApi.js on the frontend
 * exactly (list/getOne/create/update/remove), so switching that file from
 * localStorage to apiClient calls doesn't require changing any page or form.
 *
 * No auth/session concept here on purpose - "who's logged in" is still
 * tracked client-side (see AuthController for the one login endpoint that
 * exists). This just persists the user directory itself.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /** Powers Login (all users), Admin Dashboard (all users), Trainer Dashboard (role=learner). */
    @GetMapping
    public List<Document> list(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String trainerId) {
        return userService.list(role, trainerId);
    }

    /** Returns a map of trainerId -> learnerCount for the Explore Trainers page. */
    @GetMapping("/trainer-stats")
    public java.util.Map<String, Integer> trainerStats() {
        return userService.getTrainerLearnerCounts();
    }

    /** Powers re-fetching the current profile after an edit. */
    @GetMapping("/{id}")
    public Document getOne(@PathVariable String id) {
        return userService.getOne(id);
    }

    /** Powers Registration, Add Learner, Add Trainer forms. */
    @PostMapping
    public Document create(@RequestBody Map<String, Object> draft) {
        return userService.create(draft);
    }

    /** Powers Edit Profile. */
    @PutMapping("/{id}")
    public Document update(@PathVariable String id, @RequestBody Map<String, Object> patch) {
        return userService.update(id, patch);
    }

    /** Not wired to any page yet, but kept at parity with usersApi.remove(). */
    @DeleteMapping("/{id}")
    public void remove(@PathVariable String id) {
        userService.remove(id);
    }
}
