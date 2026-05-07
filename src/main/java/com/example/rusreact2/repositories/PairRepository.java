package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Pair;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PairRepository extends R2dbcRepository<Pair, UUID> {
    /// Получение просто всех пар из конкретного расписания по дате
    Flux<Pair> findByDateBetweenOrderByDateAscPairOrderAsc(LocalDate dateAfter, LocalDate dateBefore);

    /// Получение всех пар по дате и номеру пары (для получения свободных аудиторий)
    Flux<Pair> findByDateAndPairOrder(LocalDate date, int pairOrder);

    /// Только активные (утверждённые) пары в диапазоне дат
    @Query("""
        SELECT p.uuid, p.subject_uuid, p.pair_order, p.date, p.room_uuid,
               p.is_active, p.pair_type, p.group_uuids, p.lecturer_uuids
        FROM pairs p
        WHERE p.date BETWEEN :from AND :to
          AND p.is_active = true
        ORDER BY p.date ASC, p.pair_order ASC
        """)
    Flux<Pair> findByDateBetweenAndIsActiveTrue(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /// Пары для выбранных групп в диапазоне дат (для экспорта)
    @Query("""
        SELECT DISTINCT p.uuid, p.subject_uuid, p.pair_order, p.date, p.room_uuid,
               p.is_active, p.pair_type, p.group_uuids, p.lecturer_uuids
        FROM pairs p
        WHERE p.group_uuids && ARRAY[ :groupUuids ]::uuid[]
          AND p.date BETWEEN :from AND :to
          AND p.is_active = true
        ORDER BY p.date ASC, p.pair_order ASC
        """)
    Flux<Pair> findByGroupUuidsAndDateBetween(
            @Param("groupUuids") List<UUID> groupUuids,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /// Все пары для выбранных групп (включая неутверждённые) — для расчёта нагрузки
    @Query("""
        SELECT DISTINCT p.uuid, p.subject_uuid, p.pair_order, p.date, p.room_uuid,
               p.is_active, p.pair_type, p.group_uuids, p.lecturer_uuids
        FROM pairs p
        WHERE p.group_uuids && ARRAY[ :groupUuids ]::uuid[]
          AND p.date BETWEEN :from AND :to
        ORDER BY p.date ASC, p.pair_order ASC
        """)
    Flux<Pair> findByGroupUuidsAndDateBetweenAll(
            @Param("groupUuids") List<UUID> groupUuids,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /// Пары для преподавателей выбранной кафедры в диапазоне дат (для экспорта)
    @Query("""
        SELECT DISTINCT p.uuid, p.subject_uuid, p.pair_order, p.date, p.room_uuid,
               p.is_active, p.pair_type, p.group_uuids, p.lecturer_uuids
        FROM pairs p
        WHERE p.lecturer_uuids && ARRAY[ :lecturerUuids ]::uuid[]
          AND p.date BETWEEN :from AND :to
          AND p.is_active = true
        ORDER BY p.date ASC, p.pair_order ASC
        """)
    Flux<Pair> findByLecturerUuidsAndDateBetween(
            @Param("lecturerUuids") List<UUID> lecturerUuids,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
