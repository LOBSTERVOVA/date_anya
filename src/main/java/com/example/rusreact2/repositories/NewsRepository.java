package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.News;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

public interface NewsRepository extends R2dbcRepository<News, UUID> {

    @Query("""
        SELECT * FROM news
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
        """)
    Flux<News> findAllPaged(@Param("limit") int limit, @Param("offset") int offset);

    @Query("SELECT COUNT(*) FROM news")
    Mono<Long> countAll();
}
