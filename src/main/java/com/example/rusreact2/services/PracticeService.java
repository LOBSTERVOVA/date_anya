package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.PracticeDto;
import com.example.rusreact2.data.models.Practice;
import com.example.rusreact2.repositories.PairRepository;
import com.example.rusreact2.repositories.PracticeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PracticeService {
    private final PracticeRepository practiceRepository;
    private final PairRepository pairRepository;

    /// Создание новой практики.
    /// Проверки:
    /// - дата начала позже сегодняшнего дня (нельзя задним числом)
    /// - дата окончания не раньше даты начала
    /// - у группы нет практики того же типа с пересекающимися датами
    /// - если prohibitPairs = true: у группы нет активных пар в периоде практики
    public Mono<PracticeDto> createPractice(Practice practice) {
        // Базовая валидация
        if (practice.getGroupUuid() == null) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Группа обязательна"));
        }
        if (practice.getPracticeType() == null) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Тип практики обязателен"));
        }
        if (practice.getStartDate() == null) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Дата начала обязательна"));
        }
        if (practice.getEndDate() == null) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Дата окончания обязательна"));
        }

        LocalDate today = LocalDate.now();

        // Нельзя создать практику задним числом
        if (!practice.getStartDate().isAfter(today)) {
            return Mono.error(new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Нельзя создать практику задним числом. Дата начала должна быть позже " + today));
        }

        // Дата окончания не раньше даты начала
        if (practice.getEndDate().isBefore(practice.getStartDate())) {
            return Mono.error(new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Дата окончания не может быть раньше даты начала"));
        }

        // Проверка: нет ли у группы практики того же типа с пересекающимися датами
        return practiceRepository.findOverlappingSameType(
                        practice.getGroupUuid(),
                        practice.getPracticeType().name(),
                        practice.getStartDate(),
                        practice.getEndDate())
                .collectList()
                .flatMap(overlapping -> {
                    if (!overlapping.isEmpty()) {
                        Practice existing = overlapping.get(0);
                        return Mono.error(new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "У группы уже есть практика типа «" + practice.getPracticeType().getTitle()
                                        + "» с " + existing.getStartDate() + " по " + existing.getEndDate()
                                        + ". Нельзя иметь две практики одного типа одновременно."));
                    }

                    // Если prohibitPairs — проверяем, что у группы нет активных пар в периоде
                    if (practice.isProhibitPairs()) {
                        return pairRepository.findByGroupUuidsAndDateBetween(
                                        List.of(practice.getGroupUuid()),
                                        practice.getStartDate(),
                                        practice.getEndDate())
                                .collectList()
                                .flatMap(pairs -> {
                                    if (!pairs.isEmpty()) {
                                        return Mono.error(new ResponseStatusException(
                                                HttpStatus.CONFLICT,
                                                "Нельзя запретить пары: у группы есть " + pairs.size()
                                                        + " активных пар в периоде практики ("
                                                        + practice.getStartDate() + " – " + practice.getEndDate() + ")"));
                                    }
                                    return saveNew(practice);
                                });
                    }

                    return saveNew(practice);
                });
    }

    private Mono<PracticeDto> saveNew(Practice practice) {
        // UUID НЕ устанавливаем — R2DBC видит null Id и делает INSERT,
        // PostgreSQL генерирует UUID через DEFAULT gen_random_uuid()
        log.info("Создание практики: groupUuid={}, type={}, {} – {}",
                practice.getGroupUuid(), practice.getPracticeType(),
                practice.getStartDate(), practice.getEndDate());
        return practiceRepository.save(practice)
                .map(PracticeDto::from);
    }

    /// Получить практики для списка групп в диапазоне дат
    public Flux<PracticeDto> getPractices(List<UUID> groupUuids, LocalDate from, LocalDate to) {
        if (groupUuids == null || groupUuids.isEmpty()) {
            return practiceRepository.findByDateOverlap(from, to)
                    .map(PracticeDto::from);
        }
        return practiceRepository.findByGroupUuidsAndDateOverlap(groupUuids, from, to)
                .map(PracticeDto::from);
    }

    /// Удаление практики. Нельзя удалить уже начавшуюся практику.
    public Mono<Void> deletePractice(UUID uuid) {
        return practiceRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Практика не найдена")))
                .flatMap(practice -> {
                    if (practice.getStartDate().isBefore(LocalDate.now())) {
                        return Mono.error(new ResponseStatusException(
                                HttpStatus.BAD_REQUEST, "Нельзя удалить уже начавшуюся практику"));
                    }
                    log.info("Удаление практики: uuid={}, groupUuid={}, type={}, {} – {}",
                            uuid, practice.getGroupUuid(), practice.getPracticeType(),
                            practice.getStartDate(), practice.getEndDate());
                    return practiceRepository.deleteById(uuid);
                });
    }
}
