package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Group;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

public interface GroupRepository extends R2dbcRepository<Group, UUID> {
    @Query("SELECT * FROM groups g WHERE " +
            "(:q IS NULL OR :q = '' OR " +
            "LOWER(g.direction) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(g.faculty) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(g.group_name) LIKE LOWER(CONCAT('%', :q, '%'))) " +
            "ORDER BY g.direction ASC")
    Flux<Group> search(@Param("q") String q);

    @Query("SELECT * FROM groups g WHERE LOWER(g.group_name) = LOWER(:groupName) AND LOWER(g.specialization) = LOWER(:specialization) AND LOWER(g.direction) = LOWER(:direction)")
    Mono<Group> findByGroupNameAndSpecializationAndDirection(@Param("groupName") String groupName, @Param("specialization") String specialization, @Param("direction") String direction);
}
