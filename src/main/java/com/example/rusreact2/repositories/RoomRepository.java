package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Room;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface RoomRepository extends R2dbcRepository<Room, UUID> {

    @Query("SELECT * FROM rooms r WHERE LOWER(r.title) = LOWER(:title)")
    Mono<Room> findByTitle(@Param("title") String title);
}
