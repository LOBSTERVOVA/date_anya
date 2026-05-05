package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Subject;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface SubjectRepository extends R2dbcRepository<Subject, UUID> {
    Flux<Subject> findByDepartmentUuid(UUID departmentUuid);

    @Query("SELECT * FROM subjects s WHERE LOWER(s.name) = LOWER(:name) AND s.department_uuid = :departmentUuid")
    Mono<Subject> findByNameAndDepartmentUuid(@Param("name") String name, @Param("departmentUuid") UUID departmentUuid);
}
