package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.ClubSchedule;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import java.util.UUID;

@Repository
public interface ClubScheduleRepository extends ReactiveCrudRepository<ClubSchedule, UUID> {
    Flux<ClubSchedule> findByClubUuid(UUID clubUuid);

    @Query("DELETE FROM club_schedules WHERE club_uuid = :clubUuid")
    reactor.core.publisher.Mono<Void> deleteByClubUuid(UUID clubUuid);
}
