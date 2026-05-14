package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.AppUser;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface UserRepository extends R2dbcRepository<AppUser, UUID> {
    Mono<AppUser> findByUsername(String username);

    /**
     * Пагинированный список пользователей с поиском по ФИО и фильтрацией по роли.
     * Если searchText пустой — условие не применяется.
     * Если roleFilter пустой — условие не применяется.
     */
    @Query("""
        SELECT * FROM app_user
        WHERE (:search_text = '' OR
               first_name ILIKE '%' || :search_text || '%' OR
               last_name ILIKE '%' || :search_text || '%' OR
               patronymic ILIKE '%' || :search_text || '%')
          AND (:role_filter = '' OR role = CAST(:role_filter AS VARCHAR))
        ORDER BY last_name, first_name
        LIMIT :limit OFFSET :offset
        """)
    Flux<AppUser> findAllPaged(@Param("limit") int limit,
                                @Param("offset") int offset,
                                @Param("search_text") String searchText,
                                @Param("role_filter") String roleFilter);

    /**
     * Количество пользователей, соответствующих фильтрам.
     */
    @Query("""
        SELECT COUNT(*) FROM app_user
        WHERE (:search_text = '' OR
               first_name ILIKE '%' || :search_text || '%' OR
               last_name ILIKE '%' || :search_text || '%' OR
               patronymic ILIKE '%' || :search_text || '%')
          AND (:role_filter = '' OR role = CAST(:role_filter AS VARCHAR))
        """)
    Mono<Long> countFiltered(@Param("search_text") String searchText,
                              @Param("role_filter") String roleFilter);
}
