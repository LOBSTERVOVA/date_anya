package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Lecturer;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;
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
}
