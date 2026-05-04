package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Subject;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;

import java.util.Optional;
import java.util.UUID;

public interface SubjectRepository extends R2dbcRepository<Subject, UUID> {
    Flux<Subject> findByDepartmentUuid(UUID departmentUuid);
}
