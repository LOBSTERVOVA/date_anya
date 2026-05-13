package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.ReferenceMedia;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.Set;
import java.util.UUID;

public interface ReferenceMediaRepository extends R2dbcRepository<ReferenceMedia, UUID> {

    @Query("SELECT * FROM reference_media WHERE reference_uuid = :refUuid ORDER BY created_at")
    Flux<ReferenceMedia> findByReferenceUuid(@Param("refUuid") UUID refUuid);

    @Query("SELECT * FROM reference_media WHERE reference_uuid IN (:uuids) ORDER BY created_at")
    Flux<ReferenceMedia> findByReferenceUuids(@Param("uuids") Set<UUID> uuids);

    @Query("DELETE FROM reference_media WHERE reference_uuid = :refUuid")
    Mono<Void> deleteByReferenceUuid(@Param("refUuid") UUID refUuid);
}
