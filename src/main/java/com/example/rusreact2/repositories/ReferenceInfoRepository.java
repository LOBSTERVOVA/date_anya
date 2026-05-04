package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.ReferenceInfo;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

public interface ReferenceInfoRepository extends R2dbcRepository<ReferenceInfo, UUID> {

    @Query("SELECT DISTINCT theme FROM reference_info ORDER BY theme")
    Flux<String> findDistinctThemes();

    @Query("SELECT theme, COUNT(*) as cnt FROM reference_info GROUP BY theme ORDER BY theme")
    Flux<ThemeCount> findThemeCounts();

    @Query("""
        SELECT * FROM reference_info
        WHERE theme = :theme
        ORDER BY importance_level DESC, updated_at DESC
        """)
    Flux<ReferenceInfo> findByTheme(@Param("theme") String theme);
}
