package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Lecturer;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

public interface LecturerRepository extends R2dbcRepository<Lecturer, UUID> {
    @Query("""
        SELECT * FROM lecturers l
        WHERE (:q IS NULL OR :q = '' OR
               LOWER(CONCAT(COALESCE(l.last_name, ''), ' ',
                            COALESCE(l.first_name, ''), ' ',
                            COALESCE(l.patronymic, '')))
               LIKE LOWER(CONCAT('%', :q, '%')))
        ORDER BY l.last_name ASC, l.first_name ASC
        """)
    Flux<Lecturer> search(@Param("q") String q);

    Flux<Lecturer> findByDepartmentUuid(UUID departmentUuid);

    @Query("SELECT * FROM lecturers l WHERE LOWER(l.last_name) = LOWER(:lastName) AND LOWER(l.first_name) = LOWER(:firstName) AND l.department_uuid = :departmentUuid")
    Flux<Lecturer> findByLastNameAndFirstNameAndDepartmentUuid(@Param("lastName") String lastName, @Param("firstName") String firstName, @Param("departmentUuid") UUID departmentUuid);
}
