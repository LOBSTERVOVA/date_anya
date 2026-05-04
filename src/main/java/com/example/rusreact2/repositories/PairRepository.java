package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Pair;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;
import java.time.LocalDate;
import java.util.UUID;

public interface PairRepository extends R2dbcRepository<Pair, UUID> {
    /// Получение просто всех пар из конкретного расписания по дате
    Flux<Pair> findByDateBetweenOrderByDateAscPairOrderAsc(LocalDate dateAfter, LocalDate dateBefore);

    /// Получение всех пар по дате и номеру пары (для получения свободных аудиторий)
    Flux<Pair> findByDateAndPairOrder(LocalDate date, int pairOrder);
}
