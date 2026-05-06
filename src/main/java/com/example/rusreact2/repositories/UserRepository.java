package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.AppUser;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface UserRepository extends R2dbcRepository<AppUser, UUID> {
    Mono<AppUser> findByUsername(String username);
}
