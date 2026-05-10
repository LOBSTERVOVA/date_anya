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

    @Query("SELECT DISTINCT c.* FROM clubs c " +
            "WHERE c.type = :type " +
            "AND (:search IS NULL OR LOWER(c.name) LIKE '%' || LOWER(:search) || '%' OR LOWER(c.description) LIKE '%' || LOWER(:search) || '%') " +
            "AND (:departmentUuids IS NULL OR c.department_uuid = ANY(:departmentUuids)) " +
            "AND (:dayOfWeek IS NULL OR EXISTS (" +
            "  SELECT 1 FROM club_schedules cs " +
            "  WHERE cs.club_uuid = c.uuid AND cs.day_of_week = :dayOfWeek " +
            "  AND (:timeFrom IS NULL OR cs.end_time >= :timeFrom::time) " +
            "  AND (:timeTo IS NULL OR cs.start_time <= :timeTo::time) " +
            ")) " +
            "ORDER BY c.name ASC LIMIT :limit OFFSET :offset")
    Flux<Club> findByTypeWithFilters(String type, String search, UUID[] departmentUuids,
                                      Integer dayOfWeek, String timeFrom, String timeTo,
                                      int limit, long offset);

    @Query("SELECT COUNT(DISTINCT c.uuid) FROM clubs c " +
            "WHERE c.type = :type " +
            "AND (:search IS NULL OR LOWER(c.name) LIKE '%' || LOWER(:search) || '%' OR LOWER(c.description) LIKE '%' || LOWER(:search) || '%') " +
            "AND (:departmentUuids IS NULL OR c.department_uuid = ANY(:departmentUuids)) " +
            "AND (:dayOfWeek IS NULL OR EXISTS (" +
            "  SELECT 1 FROM club_schedules cs " +
            "  WHERE cs.club_uuid = c.uuid AND cs.day_of_week = :dayOfWeek " +
            "  AND (:timeFrom IS NULL OR cs.end_time >= :timeFrom::time) " +
            "  AND (:timeTo IS NULL OR cs.start_time <= :timeTo::time) " +
            "))")
    Mono<Long> countByTypeWithFilters(String type, String search, UUID[] departmentUuids,
                                       Integer dayOfWeek, String timeFrom, String timeTo);
}
