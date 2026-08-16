package com.skilltrack.api.config;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final MongoTemplate mongoTemplate;

    public CustomUserDetailsService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Document user = mongoTemplate.findOne(
                Query.query(Criteria.where("username").is(username)),
                Document.class, "users");
        if (user == null) {
            throw new UsernameNotFoundException("User not found with username: " + username);
        }

        String password = user.getString("password");
        String role = user.getString("role"); // e.g. "learner", "trainer", "admin"
        if (role == null) {
            role = "learner";
        }

        return new User(
                username,
                password != null ? password : "",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
        );
    }
}
