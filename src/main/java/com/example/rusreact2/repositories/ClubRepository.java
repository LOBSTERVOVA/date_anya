package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Club;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

@Repository
public interface ClubRepository extends ReactiveCrudRepository<Club, UUID> {
    Flux<Club> findByDepartmentUuid(UUID departmentUuid);

    @Query("SELECT * FROM clubs WHERE type = :type ORDER BY name ASC LIMIT :limit OFFSET :offset")
    Flux<Club> findByType(String type, int limit, long offset);

    @Query("SELECT COUNT(*) FROM clubs WHERE type = :type")
    Mono<Long> countByType(String type);
}
