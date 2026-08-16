package com.skilltrack.api.controller;

import com.skilltrack.api.config.JwtService;
import com.skilltrack.api.dto.LoginRequest;
import com.skilltrack.api.service.UserService;
import jakarta.validation.Valid;
import org.bson.Document;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public Document login(@Valid @RequestBody LoginRequest req) {
        try {
            Document user = userService.login(req.getUsername(), req.getPassword());
            Map<String, Object> claims = new HashMap<>();
            claims.put("id", user.getString("id"));
            claims.put("role", user.getString("role"));
            claims.put("name", user.getString("name"));

            String token = jwtService.generateToken(user.getString("username"), claims);

            user.remove("password");
            user.remove("_id");

            Document response = new Document();
            response.put("token", token);
            response.put("user", user);
            return response;
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, e.getMessage());
        }
    }
}
