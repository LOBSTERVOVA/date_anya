package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Department;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;

public interface DepartmentRepository extends R2dbcRepository<Department, UUID> {
    @Query("SELECT * FROM departments d WHERE " +
            "(:q IS NULL OR :q = '' OR LOWER(d.name) LIKE LOWER(CONCAT('%', :q, '%'))) " +
            "ORDER BY d.name ASC")
    Flux<Department> search(@Param("q") String q);
}
