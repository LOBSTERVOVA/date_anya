package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.*;
import com.example.rusreact2.data.models.Lecturer;
import com.example.rusreact2.data.models.Group;
import com.example.rusreact2.data.models.Pair;
import com.example.rusreact2.data.models.Practice;
import com.example.rusreact2.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
@Slf4j
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

                        return lecturersMono.flatMap(lecturers -> {
                            // Проверка: все группы активны
                            Set<UUID> grpUuids = p.getGroupUuids() != null ? p.getGroupUuids() : new HashSet<>();
                            Mono<Set<UUID>> groupCheckMono;
                            if (!grpUuids.isEmpty()) {
                                groupCheckMono = Flux.fromIterable(grpUuids)
                                        .flatMap(groupRepository::findById)
                                        .collectList()
                                        .flatMap(groups -> {
                                            java.util.List<String> inactiveNames = groups.stream()
                                                    .filter(g -> !g.isActive())
                                                    .map(Group::getGroupName)
                                                    .toList();
                                            if (!inactiveNames.isEmpty()) {
                                                return Mono.error(new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "Группы неактивны и не могут участвовать в расписании: "
                                                                + String.join(", ", inactiveNames)));
                                            }
                                            return Mono.just(grpUuids);
                                        });
                            } else {
                                groupCheckMono = Mono.just(grpUuids);
                            }

                            return groupCheckMono.flatMap(ignored ->
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
                                                // Проверка: все группы одного курса
                                                Set<UUID> courseGrpUuids = pp.getGroupUuids();
                                                Mono<Pair> courseCheckMono;
                                                if (courseGrpUuids != null && courseGrpUuids.size() > 1) {
                                                    courseCheckMono = Flux.fromIterable(courseGrpUuids)
                                                            .flatMap(groupRepository::findById)
                                                            .collectList()
                                                            .flatMap(groups -> {
                                                                Set<Integer> courses = groups.stream()
                                                                        .map(Group::getCourse)
                                                                        .collect(Collectors.toSet());
                                                                if (courses.size() > 1) {
                                                                    return Mono.error(new ResponseStatusException(
                                                                            HttpStatus.BAD_REQUEST,
                                                                            "Нельзя назначить группы разных курсов на одну пару"));
                                                                }
                                                                return Mono.just(pp);
                                                            });
                                                } else {
                                                    courseCheckMono = Mono.just(pp);
                                                }

                                                return courseCheckMono.flatMap(p2 -> {
                                                    // Проверка: аудитория не занята
                                                if (p2.getRoomUuid() != null) {
                                                    for (Pair existing : existingPairs) {
                                                        if (p2.getRoomUuid().equals(existing.getRoomUuid())) {
                                                            return roomRepository.findById(p2.getRoomUuid())
                                                                    .flatMap(room -> Mono.error(new ResponseStatusException(
                                                                            HttpStatus.CONFLICT,
                                                                            "Аудитория занята в это время: " + room.getTitle())));
                                                        }
                                                    }
                                                }

                                                // Все проверки пройдены — сохраняем
                                                // Новая пара: isActive = false;
                                                // Редактирование: сбрасываем в false (пара становится неутверждённой)
                                                p2.setIsActive(false);
                                                return pairRepository.save(p2)
                                                        .flatMap(this::convertPairToPairDto);
                                                });
                                            });
                                        })
                        );
                    });
        });
});
    }

    /// Клонирование недели: копирует пары с исходной недели на целевую.
    /// Фильтрует по кафедре, списку преподавателей и дням недели.
    /// Для каждой пары вызывает savePair, при ошибках собирает отчёт.
    ///
    /// Логика работы:
    /// 1. Валидация обязательных полей: departmentUuid, sourceDate, targetDate
    /// 2. Определение границ исходной недели (понедельник–воскресенье) от sourceDate
    /// 3. Определение понедельника целевой недели от targetDate — для расчёта сдвига дат
    /// 4. Построение множеств-фильтров:
    ///    - allowedDays: выбранные пользователем дни недели (или все, если не указаны)
    ///    - allowedLecturers: выбранные преподаватели (или null = все преподаватели кафедры)
    /// 5. Загрузка всех пар за исходную неделю из БД (findByDateBetween)
    /// 6. Фильтрация пар:
    ///    - день недели пары должен быть в allowedDays
    ///    - хотя бы один преподаватель пары должен быть в allowedLecturers (если фильтр задан)
    ///    Примечание: пара копируется целиком со всеми преподавателями, даже если выбран только один из них
    /// 7. Последовательная обработка отфильтрованных пар (Flux.fromIterable):
    ///    a. Вычисление сдвига в днях между исходным и целевым понедельниками
    ///    b. Создание объекта-копии Pair:
    ///       - uuid = null (новая пара, а не редактирование)
    ///       - дата = исходная дата + сдвиг дней (сохраняется тот же день недели)
    ///       - pairOrder, subjectUuid, roomUuid, type — копируются как есть
    ///       - lecturerUuids, groupUuids — копируются в новые HashSet (во избежание shared references)
    ///       - isActive = false (новая пара неутверждённая, как при ручном создании)
    ///    c. Вызов savePair(newPair) — проходит полную валидацию как при создании пары вручную:
    ///       - проверка даты (не в прошлом)
    ///       - проверка предмета и его существования
    ///       - проверка, что все преподаватели относятся к кафедре предмета
    ///       - проверка занятости преподавателей на это время
    ///       - проверка занятости групп на это время
    ///       - проверка практик с запретом пар (prohibitPairs=true)
    ///       - проверка занятости аудитории
    ///       - при успехе: сохранение в БД и увеличение successCount
    ///    d. При ошибке (onErrorResume):
    ///       - извлечение причины из исключения (ResponseStatusException.getReason() или getMessage())
    ///       - для каждого преподавателя пары создаётся запись CloneError:
    ///         день недели, номер пары, ФИО преподавателя, причина ошибки
    ///       - если преподавателей в паре нет — запись с прочерком вместо имени
    ///       - ошибка не прерывает обработку остальных пар (Mono.empty() / then)
    /// 8. Возврат CloneResponse с итоговым successCount и списком ошибок
        /// Клонирование недели: копирует пары с исходной недели на целевую.
    /// Фильтрует по кафедре, списку преподавателей и дням недели.
    /// Для каждой пары вызывает savePair, при ошибках собирает отчёт.
    ///
    /// Логика работы:
    /// 1. Валидация обязательных полей: departmentUuid, sourceDate, targetDate
    /// 2. Определение границ исходной недели (понедельник–воскресенье) от sourceDate
    /// 3. Определение понедельника целевой недели от targetDate — для расчёта сдвига дат
    /// 4. Загрузка всех преподавателей указанной кафедры (departmentUuid)
    /// 5. Формирование множества разрешённых преподавателей:
    ///    - если lecturerUuids не пуст — фильтруем: только преподаватели кафедры из списка
    ///    - если lecturerUuids пуст — все преподаватели кафедры
    /// 6. Загрузка всех пар за исходную неделю из БД (findByDateBetween)
    /// 7. Фильтрация пар:
    ///    - день недели пары должен быть в allowedDays
    ///    - хотя бы один преподаватель пары должен быть в allowedLecturers
    ///    Примечание: пара копируется целиком со всеми преподавателями, даже если выбран только один из них
    /// 8. Последовательная обработка отфильтрованных пар (Flux.fromIterable):
    ///    a. Вычисление сдвига в днях между исходным и целевым понедельниками
    ///    b. Создание объекта-копии Pair
    ///    c. Вызов savePair(newPair) — полная валидация как при создании пары вручную
    ///    d. При ошибке (onErrorResume): сбор информации в CloneError, продолжение цикла
    /// 9. Возврат CloneResponse с итоговым successCount и списком ошибок
    public Mono<CloneResponse> cloneWeek(CloneRequest request) {
        UUID departmentUuid = request.getDepartmentUuid();
        LocalDate sourceDate = request.getSourceDate();
        LocalDate targetDate = request.getTargetDate();
        List<UUID> lecturerUuids = request.getLecturerUuids();
        List<java.time.DayOfWeek> daysOfWeek = request.getDaysOfWeek();

        log.info("cloneWeek: ЗАПРОС departmentUuid={}, sourceDate={}, targetDate={}, lecturerUuids={}, daysOfWeek={}",
                departmentUuid, sourceDate, targetDate, lecturerUuids, daysOfWeek);

        // Проверка обязательных полей
        if (departmentUuid == null || sourceDate == null || targetDate == null) {
            log.warn("cloneWeek: обязательные поля не заполнены");
            return Mono.error(new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "departmentUuid, sourceDate и targetDate обязательны"));
        }

        // Определяем понедельники исходной и целевой недели
        java.time.DayOfWeek monday = java.time.DayOfWeek.MONDAY;
        LocalDate sourceMonday = sourceDate.with(monday);
        LocalDate targetMonday = targetDate.with(monday);
        LocalDate sourceSunday = sourceMonday.plusDays(6);

        log.info("cloneWeek: исходная неделя {} — {}, целевой понедельник={}",
                sourceMonday, sourceSunday, targetMonday);

        // Множество дней недели для фильтрации: если не указаны — копируем все дни
        Set<java.time.DayOfWeek> allowedDays = (daysOfWeek != null && !daysOfWeek.isEmpty())
                ? new HashSet<>(daysOfWeek)
                : Set.of(java.time.DayOfWeek.values());
        log.info("cloneWeek: разрешённые дни недели={}", allowedDays);

        // Загружаем преподавателей кафедры и формируем множество разрешённых преподавателей
        return lecturerRepository.findByDepartmentUuid(departmentUuid)
                .collectList()
                .flatMap(deptLecturers -> {
                    log.info("cloneWeek: найдено преподавателей кафедры={}", deptLecturers.size());

                    if (deptLecturers.isEmpty()) {
                        log.warn("cloneWeek: у кафедры {} нет преподавателей", departmentUuid);
                        CloneResponse emptyResponse = new CloneResponse();
                        return Mono.just(emptyResponse);
                    }

                    // Множество UUID преподавателей для фильтрации пар
                    Set<UUID> allowedLecturers;
                    if (lecturerUuids != null && !lecturerUuids.isEmpty()) {
                        // Пользователь выбрал конкретных преподавателей — фильтруем по ним
                        allowedLecturers = new HashSet<>(lecturerUuids);
                        log.info("cloneWeek: выбрано преподавателей пользователем={}", allowedLecturers.size());
                    } else {
                        // Пользователь не выбирал — берём всех преподавателей кафедры
                        allowedLecturers = deptLecturers.stream()
                                .map(Lecturer::getUuid)
                                .collect(Collectors.toSet());
                        log.info("cloneWeek: используются все преподаватели кафедры, всего={}", allowedLecturers.size());
                    }

                    // Загружаем все пары за исходную неделю
                    return pairRepository.findByDateBetweenOrderByDateAscPairOrderAsc(sourceMonday, sourceSunday)
                            .doOnNext(p -> log.debug("cloneWeek: пара из БД date={} order={} subject={} lecturers={}",
                                    p.getDate(), p.getPairOrder(), p.getSubjectUuid(), p.getLecturerUuids()))
                            .filter(pair -> {
                                // Фильтр по дню недели
                                if (!allowedDays.contains(pair.getDate().getDayOfWeek())) {
                                    log.debug("cloneWeek: пара пропущена — день недели {} не в списке разрешённых",
                                            pair.getDate().getDayOfWeek());
                                    return false;
                                }
                                // Фильтр по преподавателям: пара должна иметь хотя бы одного преподавателя из кафедры
                                if (pair.getLecturerUuids() == null || pair.getLecturerUuids().isEmpty()) {
                                    log.debug("cloneWeek: пара пропущена — нет преподавателей");
                                    return false;
                                }
                                boolean hasAllowed = pair.getLecturerUuids().stream()
                                        .anyMatch(allowedLecturers::contains);
                                if (!hasAllowed) {
                                    log.debug("cloneWeek: пара пропущена — преподаватели {} не относятся к выбранной кафедре",
                                            pair.getLecturerUuids());
                                    return false;
                                }
                                log.debug("cloneWeek: пара ПРОШЛА фильтр date={} order={}",
                                        pair.getDate(), pair.getPairOrder());
                                return true;
                            })
                            .collectList()
                            .flatMap(sourcePairs -> {
                                log.info("cloneWeek: после фильтрации осталось пар={}", sourcePairs.size());

                                CloneResponse response = new CloneResponse();
                                if (sourcePairs.isEmpty()) {
                                    log.info("cloneWeek: нет пар для копирования, возвращаем пустой отчёт");
                                    return Mono.just(response);
                                }

                                long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(sourceMonday, targetMonday);
                                log.info("cloneWeek: сдвиг между неделями={} дней, начинаем копирование {} пар",
                                        daysBetween, sourcePairs.size());

                                return Flux.fromIterable(sourcePairs)
                                        .flatMap(sourcePair -> {
                                            // Создаём копию пары для целевой недели
                                            Pair newPair = new Pair();
                                            newPair.setUuid(null);
                                            newPair.setDate(sourcePair.getDate().plusDays(daysBetween));
                                            newPair.setPairOrder(sourcePair.getPairOrder());
                                            newPair.setSubjectUuid(sourcePair.getSubjectUuid());
                                            newPair.setRoomUuid(sourcePair.getRoomUuid());
                                            newPair.setType(sourcePair.getType());
                                            newPair.setIsActive(false);
                                            if (sourcePair.getLecturerUuids() != null) {
                                                newPair.setLecturerUuids(new HashSet<>(sourcePair.getLecturerUuids()));
                                            }
                                            if (sourcePair.getGroupUuids() != null) {
                                                newPair.setGroupUuids(new HashSet<>(sourcePair.getGroupUuids()));
                                            }

                                            log.debug("cloneWeek: копируем пару date={} order={} -> date={}",
                                                    sourcePair.getDate(), sourcePair.getPairOrder(),
                                                    newPair.getDate());

                                            return savePair(newPair)
                                                    .map(saved -> {
                                                        log.debug("cloneWeek: пара УСПЕШНО создана date={} order={}",
                                                                saved.getDate(), saved.getPairOrder());
                                                        response.setSuccessCount(response.getSuccessCount() + 1);
                                                        return saved;
                                                    })
                                                    .onErrorResume(e -> {
                                                        String reason = e instanceof ResponseStatusException
                                                                ? ((ResponseStatusException) e).getReason()
                                                                : (e.getMessage() != null ? e.getMessage()
                                                                        : "Неизвестная ошибка");
                                                        log.warn("cloneWeek: ОШИБКА создания пары date={} order={}: {}",
                                                                newPair.getDate(), newPair.getPairOrder(), reason);

                                                        Set<UUID> lecUuids = sourcePair.getLecturerUuids();
                                                        if (lecUuids != null && !lecUuids.isEmpty()) {
                                                            return Flux.fromIterable(lecUuids)
                                                                    .flatMap(lecUuid -> lecturerRepository
                                                                            .findById(lecUuid)
                                                                            .map(lecturer -> {
                                                                                String name = lecturer.getLastName()
                                                                                        + " "
                                                                                        + lecturer.getFirstName();
                                                                                if (lecturer.getPatronymic() != null
                                                                                        && !lecturer.getPatronymic()
                                                                                                .isEmpty()) {
                                                                                    name += " "
                                                                                            + lecturer.getPatronymic();
                                                                                }
                                                                                CloneResponse.CloneError error = new CloneResponse.CloneError(
                                                                                        sourcePair.getDate()
                                                                                                .getDayOfWeek(),
                                                                                        sourcePair.getPairOrder(),
                                                                                        name,
                                                                                        reason);
                                                                                response.getErrors().add(error);
                                                                                return lecturer;
                                                                            }))
                                                                    .then(Mono.<PairDto>empty());
                                                        } else {
                                                            CloneResponse.CloneError error = new CloneResponse.CloneError(
                                                                    sourcePair.getDate().getDayOfWeek(),
                                                                    sourcePair.getPairOrder(),
                                                                    "—",
                                                                    reason);
                                                            response.getErrors().add(error);
                                                            return Mono.empty();
                                                        }
                                                    });
                                        })
                                        .then(Mono.fromCallable(() -> {
                                            log.info("cloneWeek: ЗАВЕРШЕНО successCount={}, errors={}",
                                                    response.getSuccessCount(), response.getErrors().size());
                                            return response;
                                        }));
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

    // Расписание пар: порядковый номер → (начало, конец), МСК
    private static final LocalTime[][] PAIR_TIMES = {
        {LocalTime.of(8, 50), LocalTime.of(10, 20)},   // 1-я пара
        {LocalTime.of(10, 40), LocalTime.of(12, 10)},  // 2-я пара
        {LocalTime.of(13, 0), LocalTime.of(14, 30)},   // 3-я пара
        {LocalTime.of(14, 50), LocalTime.of(16, 20)},  // 4-я пара
        {LocalTime.of(16, 40), LocalTime.of(18, 10)},  // 5-я пара
        {LocalTime.of(18, 30), LocalTime.of(20, 0)},   // 6-я пара
        {LocalTime.of(20, 20), LocalTime.of(21, 50)},  // 7-я пара
        {LocalTime.of(22, 10), LocalTime.of(23, 40)},  // 8-я пара
    };

    /// Определяет номер первой непрошедшей пары на сегодня.
    /// Если текущее время раньше окончания пары N — пара N ещё не прошла.
    /// Возвращает -1, если все пары уже закончились.
    private int getFirstUpcomingPairOrder(LocalTime now) {
        for (int i = 0; i < PAIR_TIMES.length; i++) {
            if (now.isBefore(PAIR_TIMES[i][1])) {
                return i + 1; // пары нумеруются с 1
            }
        }
        return -1; // все пары закончились
    }

    /// Получить ближайшие пары для преподавателя или группы.
    /// Ищет ближайший день, когда есть пары у сущности (начиная с сегодня).
    /// Если пары есть сегодня — возвращает только непрошедшие (по текущему времени МСК).
    /// Если сегодня пар нет или все прошли — возвращает все пары следующего дня с парами.
    ///
    /// @param entityUuid UUID преподавателя или группы
    /// @param entityType "LECTURER" или "GROUP"
    public Flux<PairDto> getNearestPairs(UUID entityUuid, String entityType) {
        if (entityUuid == null || entityType == null) return Flux.empty();

        ZoneId msk = ZoneId.of("Europe/Moscow");
        LocalDate today = LocalDate.now(msk);
        LocalTime now = LocalTime.now(msk);

        int firstUpcoming = getFirstUpcomingPairOrder(now);
        log.debug("getNearestPairs: entityUuid={}, type={}, today={}, now={}, firstUpcoming={}",
                entityUuid, entityType, today, now, firstUpcoming);

        Flux<Pair> pairsFlux;
        if ("LECTURER".equalsIgnoreCase(entityType)) {
            pairsFlux = pairRepository.findByLecturerUuidAndDateFrom(entityUuid, today);
        } else if ("GROUP".equalsIgnoreCase(entityType)) {
            pairsFlux = pairRepository.findByGroupUuidAndDateFrom(entityUuid, today);
        } else {
            return Flux.error(new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "entityType должен быть LECTURER или GROUP"));
        }

        return pairsFlux
                .collectList()
                .flatMapMany(pairs -> {
                    if (pairs.isEmpty()) return Flux.empty();

                    // Группируем по дате
                    Map<LocalDate, List<Pair>> byDate = pairs.stream()
                            .collect(Collectors.groupingBy(Pair::getDate));

                    // Сортируем даты
                    List<LocalDate> sortedDates = byDate.keySet().stream()
                            .sorted()
                            .collect(Collectors.toList());

                    // Ищем ближайший день с непрошедшими парами
                    for (LocalDate date : sortedDates) {
                        List<Pair> dayPairs = byDate.get(date);

                        if (date.equals(today)) {
                            // Сегодня: фильтруем по времени, если ещё есть непрошедшие
                            if (firstUpcoming == -1) {
                                // Все пары сегодня закончились — идём к следующему дню
                                continue;
                            }
                            List<Pair> upcoming = dayPairs.stream()
                                    .filter(p -> p.getPairOrder() >= firstUpcoming)
                                    .sorted(Comparator.comparingInt(Pair::getPairOrder))
                                    .collect(Collectors.toList());
                            if (!upcoming.isEmpty()) {
                                return Flux.fromIterable(upcoming)
                                        .flatMap(this::convertPairToPairDto);
                            }
                            // На сегодня пар, удовлетворяющих фильтру, нет — идём дальше
                        } else {
                            // Будущий день — возвращаем все пары дня
                            dayPairs.sort(Comparator.comparingInt(Pair::getPairOrder));
                            return Flux.fromIterable(dayPairs)
                                    .flatMap(this::convertPairToPairDto);
                        }
                    }

                    return Flux.empty();
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
                                    && p.getLecturerUuids().stream().anyMatch(lecturerUuids::contains)
                                    && !p.getIsActive())
                            .flatMap(p -> {
                                p.setIsActive(true);
                                return pairRepository.save(p);
                            })
                            .count()
                            .map(Long::intValue);
                });
    }

}
