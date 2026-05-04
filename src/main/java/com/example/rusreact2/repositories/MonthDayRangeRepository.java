package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.MonthDayRange;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

public interface MonthDayRangeRepository extends R2dbcRepository<MonthDayRange, UUID> {

    @Query("SELECT * FROM month_day_ranges WHERE reference_uuid = :refUuid ORDER BY start_month, start_day")
    Flux<MonthDayRange> findByReferenceUuid(@Param("refUuid") UUID refUuid);

    @Query("DELETE FROM month_day_ranges WHERE reference_uuid = :refUuid")
    Mono<Void> deleteByReferenceUuid(@Param("refUuid") UUID refUuid);
}
