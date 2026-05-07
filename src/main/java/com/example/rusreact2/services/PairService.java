package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.*;
import com.example.rusreact2.data.models.Lecturer;
import com.example.rusreact2.data.models.Group;
import com.example.rusreact2.data.models.Pair;
import com.example.rusreact2.data.models.Practice;
import com.example.rusreact2.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PairService {
    private final PairRepository pairRepository;
    private final LecturerRepository lecturerRepository;
    private final GroupRepository groupRepository;
    private final RoomRepository roomRepository;
    private final SubjectRepository subjectRepository;
    private final PracticeRepository practiceRepository;

    /// Получить пары для недели по группе
    /// Функция включает приватные методы для получения связанных данных (лекторы, группы, аудитории, предметы)
    public Flux<PairDto> getWeekPairsBatch(LocalDate from, LocalDate to) {
        if (from == null) return Flux.empty();
        LocalDate end = to != null ? to : from.plusDays(6);

        return pairRepository.findByDateBetweenOrderByDateAscPairOrderAsc(from, end)
                .flatMap(this::convertPairToPairDto);
    }

    private Mono<PairDto> convertPairToPairDto(Pair pair) {
        return Mono.zip(
                getLecturers(pair.getLecturerUuids()),
                getGroups(pair.getGroupUuids()),
                getRoom(pair.getRoomUuid()),
                getSubject(pair.getSubjectUuid())
        ).map(tuple -> new PairDto().minimumPairDto(
                pair,
                tuple.getT4(), // subject
                tuple.getT3(), // room
                tuple.getT1(), // lecturers
                tuple.getT2()  // groups
        ));
    }

    private Mono<List<LecturerDto>> getLecturers(Set<UUID> uuids) {
        if (uuids == null || uuids.isEmpty()) return Mono.just(new ArrayList<>());
        return Flux.fromIterable(uuids)
                .flatMap(lecturerRepository::findById)
                .map(lecturer -> new LecturerDto().minimumLecturerDto(lecturer))
                .collectList();
    }

    private Mono<List<GroupDto>> getGroups(Set<UUID> uuids) {
        if (uuids == null || uuids.isEmpty()) return Mono.just(new ArrayList<>());
        return Flux.fromIterable(uuids)
                .flatMap(groupRepository::findById)
                .map(group -> new GroupDto().minimumGroupDto(group))
                .collectList();
    }

    private Mono<RoomDto> getRoom(UUID uuid) {
        if (uuid == null) return Mono.just(new RoomDto());  // null-object, чтобы Mono.zip не схлопывался
        return roomRepository.findById(uuid)
                .map(room -> new RoomDto(room.getUuid(), room.getTitle()))
                .switchIfEmpty(Mono.just(new RoomDto()));
    }

    private Mono<SubjectDto> getSubject(UUID uuid) {
        if (uuid == null) return Mono.empty();
        return subjectRepository.findById(uuid)
                .map(subject -> new SubjectDto().minimumSubjectDto(subject));
    }


//    /// Получение всех пар на конкретный день и конкретный порядковый номер пары (например все первые пары на 1 сентября)
//    public Flux<Pair> getPairsByDateAndPairOrder(LocalDate date, int pairOrder) {
//        return pairRepository.findByDateAndPairOrder(date, pairOrder);
//    }

    /// Получить только активные (утверждённые) пары за период
    public Flux<PairDto> getActivePairsBatch(LocalDate from, LocalDate to) {
        if (from == null) return Flux.empty();
        LocalDate end = to != null ? to : from.plusDays(6);
        return pairRepository.findByDateBetweenAndIsActiveTrue(from, end)
                .flatMap(this::convertPairToPairDto);
    }

    /// Сохранение пары (создание или редактирование):
    /// - если uuid отсутствует — создание новой пары
    /// - если uuid передан — редактирование существующей
    /// Проверки:
    /// - преподаватели не заняты в это время (кроме самой редактируемой пары)
    /// - группы не заняты в это время (кроме самой редактируемой пары)
    /// - у групп нет активной практики с запретом пар (prohibitPairs=true) на дату пары
    ///   (если prohibitPairs=false — пару можно создать во время практики)
    /// - аудитория не занята (если указана, кроме самой редактируемой пары)
    /// - все преподаватели и предмет относятся к одной кафедре
    public Mono<PairDto> savePair(Pair pair) {
        boolean isUpdate = pair.getUuid() != null;

        // При создании: базовая валидация сразу
        // При редактировании: сначала проверим существование
        Mono<Pair> pairMono;
        if (isUpdate) {
            pairMono = pairRepository.findById(pair.getUuid())
                    .switchIfEmpty(Mono.error(new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Пара с uuid " + pair.getUuid() + " не найдена")))
                    .map(existing -> pair); // просто подтверждаем существование
        } else {
            pairMono = Mono.just(pair);
        }

        return pairMono.flatMap(p -> {
            if (p.getDate() == null) {
                return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Дата пары обязательна"));
            }
            if (p.getDate().isBefore(LocalDate.now())) {
                return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Нельзя ставить пару задним числом"));
            }
            if (p.getSubjectUuid() == null) {
                return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Предмет обязателен"));
            }
            if (p.getLecturerUuids() == null || p.getLecturerUuids().isEmpty()) {
                return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Укажите хотя бы одного преподавателя"));
            }

            return subjectRepository.findById(p.getSubjectUuid())
                    .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Предмет не найден")))
                    .flatMap(subject -> {
                        UUID departmentUuid = subject.getDepartmentUuid();
                        Set<UUID> lecturerUuids = p.getLecturerUuids();

                        // Загружаем преподавателей и проверяем кафедру
                        Mono<java.util.List<Lecturer>> lecturersMono = Flux.fromIterable(lecturerUuids)
                                .flatMap(lecturerRepository::findById)
                                .collectList()
                                .flatMap(lecturers -> {
                                    for (Lecturer l : lecturers) {
                                        if (!departmentUuid.equals(l.getDepartmentUuid())) {
                                            return Mono.error(new ResponseStatusException(
                                                    HttpStatus.BAD_REQUEST,
                                                    "Преподаватель " + l.getLastName() + " " + l.getFirstName()
                                                            + " не относится к кафедре предмета"));
                                        }
                                    }
                                    return Mono.just(lecturers);
                                });

                        return lecturersMono.flatMap(lecturers ->
                                pairRepository.findByDateAndPairOrder(p.getDate(), p.getPairOrder())
                                        .collectList()
                                        .flatMap(allPairs -> {
                                            // При редактировании исключаем саму редактируемую пару из проверок конфликтов
                                            List<Pair> existingPairs = allPairs.stream()
                                                    .filter(existing -> isUpdate
                                                            ? !existing.getUuid().equals(p.getUuid())
                                                            : true)
                                                    .collect(Collectors.toList());

                                            // Проверка: преподаватели не заняты
                                            Set<UUID> busyLecturers = new HashSet<>();
                                            for (Pair existing : existingPairs) {
                                                Set<UUID> existingLecs = existing.getLecturerUuids();
                                                if (existingLecs != null) {
                                                    for (UUID lecUuid : lecturerUuids) {
                                                        if (existingLecs.contains(lecUuid)) {
                                                            busyLecturers.add(lecUuid);
                                                        }
                                                    }
                                                }
                                            }
                                            if (!busyLecturers.isEmpty()) {
                                                return Flux.fromIterable(busyLecturers)
                                                        .flatMap(lecturerRepository::findById)
                                                        .collectList()
                                                        .flatMap(busyLecs -> {
                                                            String names = busyLecs.stream()
                                                                    .map(l -> l.getLastName() + " " + l.getFirstName())
                                                                    .collect(Collectors.joining(", "));
                                                            return Mono.error(new ResponseStatusException(
                                                                    HttpStatus.CONFLICT,
                                                                    "Преподаватели заняты в это время: " + names));
                                                        });
                                            }

                                            // Проверка: группы не заняты
                                            Set<UUID> groupUuids = p.getGroupUuids() != null ? p.getGroupUuids() : new HashSet<>();
                                            if (!groupUuids.isEmpty()) {
                                                Set<UUID> busyGroups = new HashSet<>();
                                                for (Pair existing : existingPairs) {
                                                    Set<UUID> existingGrps = existing.getGroupUuids();
                                                    if (existingGrps != null) {
                                                        for (UUID grUuid : groupUuids) {
                                                            if (existingGrps.contains(grUuid)) {
                                                                busyGroups.add(grUuid);
                                                            }
                                                        }
                                                    }
                                                }
                                                if (!busyGroups.isEmpty()) {
                                                    return Flux.fromIterable(busyGroups)
                                                            .flatMap(groupRepository::findById)
                                                            .collectList()
                                                            .flatMap(busyGrps -> {
                                                                String names = busyGrps.stream()
                                                                        .map(Group::getGroupName)
                                                                        .collect(Collectors.joining(", "));
                                                                return Mono.error(new ResponseStatusException(
                                                                        HttpStatus.CONFLICT,
                                                                        "Группы заняты в это время: " + names));
                                                            });
                                                }
                                            }

                                            // Проверка: у групп нет практик с запретом пар на эту дату
                                            // (если prohibitPairs=false — пару можно создать во время практики)
                                            Mono<Pair> practiceCheckMono;
                                            if (!groupUuids.isEmpty()) {
                                                practiceCheckMono = practiceRepository.findBlockingPractices(
                                                                new ArrayList<>(groupUuids), p.getDate())
                                                        .collectList()
                                                        .flatMap(blockingPractices -> {
                                                            if (!blockingPractices.isEmpty()) {
                                                                Set<UUID> blockedGroupUuids = blockingPractices.stream()
                                                                        .map(Practice::getGroupUuid)
                                                                        .collect(Collectors.toSet());
                                                                return Flux.fromIterable(blockedGroupUuids)
                                                                        .flatMap(groupRepository::findById)
                                                                        .collectList()
                                                                        .flatMap(blockedGroups -> {
                                                                            String names = blockedGroups.stream()
                                                                                    .map(Group::getGroupName)
                                                                                    .collect(Collectors.joining(", "));
                                                                            return Mono.error(new ResponseStatusException(
                                                                                    HttpStatus.CONFLICT,
                                                                                    "Нельзя создать пару: у групп " + names
                                                                                            + " в этот день действует практика, запрещающая проведение пар"));
                                                                        });
                                                            }
                                                            return Mono.just(p);
                                                        });
                                            } else {
                                                practiceCheckMono = Mono.just(p);
                                            }

                                            return practiceCheckMono.flatMap(pp -> {
                                                // Проверка: аудитория не занята
                                                if (pp.getRoomUuid() != null) {
                                                    for (Pair existing : existingPairs) {
                                                        if (pp.getRoomUuid().equals(existing.getRoomUuid())) {
                                                            return roomRepository.findById(pp.getRoomUuid())
                                                                    .flatMap(room -> Mono.error(new ResponseStatusException(
                                                                            HttpStatus.CONFLICT,
                                                                            "Аудитория занята в это время: " + room.getTitle())));
                                                        }
                                                    }
                                                }

                                                // Все проверки пройдены — сохраняем
                                                // Новая пара: isActive = false;
                                                // Редактирование: сбрасываем в false (пара становится неутверждённой)
                                                pp.setIsActive(false);
                                                return pairRepository.save(pp)
                                                        .flatMap(this::convertPairToPairDto);
                                            });
                                        })
                        );
                    });
        });
    }

    /// Удаление пары. Нельзя удалить пару с прошедшей датой.
    public Mono<Void> deletePair(UUID uuid) {
        return pairRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Пара не найдена")))
                .flatMap(pair -> {
                    if (pair.getDate().isBefore(LocalDate.now())) {
                        return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Нельзя удалить прошедшую пару"));
                    }
//                    if (pair.getIsActive()) {
//                        return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Пара уже утверждена, ее нельзя удалить"));
//                    }
                    return pairRepository.deleteById(uuid);
                });
    }

    /// Утвердить пары для выбранных кафедр: помечает isActive=true всем парам,
    /// которые ведут преподаватели указанных кафедр
    public Mono<Integer> approvePairs(Set<UUID> departmentUuids) {
        return lecturerRepository.findAll()
                .filter(l -> l.getDepartmentUuid() != null && departmentUuids.contains(l.getDepartmentUuid()))
                .map(Lecturer::getUuid)
                .collect(Collectors.toSet())
                .flatMap(lecturerUuids -> {
                    if (lecturerUuids.isEmpty()) return Mono.just(0);
                    return pairRepository.findAll()
                            .filter(p -> p.getLecturerUuids() != null
                                    && p.getLecturerUuids().stream().anyMatch(lecturerUuids::contains))
                            .flatMap(p -> {
                                p.setIsActive(true);
                                return pairRepository.save(p);
                            })
                            .count()
                            .map(Long::intValue);
                });
    }

}
