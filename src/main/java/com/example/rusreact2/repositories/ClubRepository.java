package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Club;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import java.util.UUID;

@Repository
public interface ClubRepository extends ReactiveCrudRepository<Club, UUID> {
    Flux<Club> findByDepartmentUuid(UUID departmentUuid);
}
