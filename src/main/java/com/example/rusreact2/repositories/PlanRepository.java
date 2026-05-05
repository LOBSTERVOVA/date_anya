package com.example.rusreact2.repositories;

import com.example.rusreact2.data.enums.LessonType;
import com.example.rusreact2.data.models.Plan;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface PlanRepository extends R2dbcRepository<Plan, UUID> {

    @Query("""
        SELECT * FROM plans p
        WHERE p.group_uuid = :groupUuid
          AND p.subject_uuid = :subjectUuid
          AND p.term = :term
          AND p.lesson_type = :lessonType
        """)
    Mono<Plan> findByGroupUuidAndSubjectUuidAndTermAndLessonType(
            @Param("groupUuid") UUID groupUuid,
            @Param("subjectUuid") UUID subjectUuid,
            @Param("term") int term,
            @Param("lessonType") LessonType lessonType);
}
