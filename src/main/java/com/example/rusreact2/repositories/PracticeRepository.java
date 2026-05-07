package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Practice;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.repository.query.Param;
import reactor.core.publisher.Flux;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PracticeRepository extends R2dbcRepository<Practice, UUID> {

    /// Практики для выбранных групп в диапазоне дат
    @Query("""
        SELECT p.uuid, p.group_uuid, p.title, p.practice_type,
               p.start_date, p.end_date, p.prohibit_pairs
        FROM practices p
        WHERE p.group_uuid IN (:groupUuids)
          AND p.start_date <= :toDate
          AND p.end_date >= :fromDate
        ORDER BY p.start_date ASC
        """)
    Flux<Practice> findByGroupUuidsAndDateOverlap(
            @Param("groupUuids") List<UUID> groupUuids,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    /// Проверка пересечения: есть ли у группы практика того же типа с пересекающимися датами
    /// Пересечение: существующий start <= новый end AND существующий end >= новый start
    @Query("""
        SELECT p.uuid, p.group_uuid, p.title, p.practice_type,
               p.start_date, p.end_date, p.prohibit_pairs
        FROM practices p
        WHERE p.group_uuid = :groupUuid
          AND p.practice_type = :practiceType
          AND p.start_date <= :endDate
          AND p.end_date >= :startDate
        """)
    Flux<Practice> findOverlappingSameType(
            @Param("groupUuid") UUID groupUuid,
            @Param("practiceType") String practiceType,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    /// Все практики в диапазоне дат (для полной загрузки сетки)
    @Query("""
        SELECT p.uuid, p.group_uuid, p.title, p.practice_type,
               p.start_date, p.end_date, p.prohibit_pairs
        FROM practices p
        WHERE p.start_date <= :toDate
          AND p.end_date >= :fromDate
        ORDER BY p.start_date ASC
        """)
    Flux<Practice> findByDateOverlap(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    /// Практики, блокирующие создание пар: для групп на конкретную дату
    /// где prohibit_pairs = TRUE и дата попадает в диапазон практики
    @Query("""
        SELECT p.uuid, p.group_uuid, p.title, p.practice_type,
               p.start_date, p.end_date, p.prohibit_pairs
        FROM practices p
        WHERE p.group_uuid IN (:groupUuids)
          AND p.start_date <= :date
          AND p.end_date >= :date
          AND p.prohibit_pairs = TRUE
        """)
    Flux<Practice> findBlockingPractices(
            @Param("groupUuids") List<UUID> groupUuids,
            @Param("date") LocalDate date);
}
