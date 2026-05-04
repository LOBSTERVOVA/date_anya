package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.*;
import com.example.rusreact2.data.models.Lecturer;
import com.example.rusreact2.data.models.Group;
import com.example.rusreact2.data.models.Pair;
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
        if (uuid == null) return Mono.empty();
        return roomRepository.findById(uuid)
                .map(room -> new RoomDto(room.getUuid(), room.getTitle()));
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

    /// Создание пары с проверками:
    /// - преподаватели не заняты в это время
    /// - группы не заняты в это время
    /// - аудитория не занята (если указана)
    /// - все преподаватели и предмет относятся к одной кафедре
    public Mono<PairDto> createPair(Pair pair) {
        if (pair.getDate() == null) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Дата пары обязательна"));
        }
        if (pair.getDate().isBefore(LocalDate.now())) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Нельзя ставить пару задним числом"));
        }
        if (pair.getSubjectUuid() == null) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Предмет обязателен"));
        }
        if (pair.getLecturerUuids().isEmpty()) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Укажите хотя бы одного преподавателя"));
        }

        return subjectRepository.findById(pair.getSubjectUuid())
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Предмет не найден")))
                .flatMap(subject -> {
                    UUID departmentUuid = subject.getDepartmentUuid();

                    // Загружаем преподавателей и проверяем кафедру
                    Mono<java.util.List<Lecturer>> lecturersMono;
                    Set<UUID> lecturerUuids = pair.getLecturerUuids() != null ? pair.getLecturerUuids() : new HashSet<>();
                    if (!lecturerUuids.isEmpty()) {
                        lecturersMono = Flux.fromIterable(lecturerUuids)
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
                    } else {
                        lecturersMono = Mono.just(new ArrayList<>());
                    }

                    return lecturersMono.flatMap(lecturers ->
                            pairRepository.findByDateAndPairOrder(pair.getDate(), pair.getPairOrder())
                                    .collectList()
                                    .flatMap(existingPairs -> {
                                        // Проверка: преподаватели не заняты
                                        if (!lecturerUuids.isEmpty()) {
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
                                        }

                                        // Проверка: группы не заняты
                                        Set<UUID> groupUuids = pair.getGroupUuids() != null ? pair.getGroupUuids() : new HashSet<>();
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

                                        // Проверка: аудитория не занята
                                        if (pair.getRoomUuid() != null) {
                                            for (Pair existing : existingPairs) {
                                                if (pair.getRoomUuid().equals(existing.getRoomUuid())) {
                                                    return roomRepository.findById(pair.getRoomUuid())
                                                            .flatMap(room -> Mono.error(new ResponseStatusException(
                                                                    HttpStatus.CONFLICT,
                                                                    "Аудитория занята в это время: " + room.getTitle())));
                                                }
                                            }
                                        }

                                        // Все проверки пройдены — сохраняем
                                        pair.setIsActive(false);
                                        return pairRepository.save(pair)
                                                .flatMap(this::convertPairToPairDto);
                                    })
                    );
                });
    }

}
