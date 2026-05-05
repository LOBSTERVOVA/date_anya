package com.example.rusreact2.jobs;

import com.example.rusreact2.data.dto.ImportLecturerDto;
import com.example.rusreact2.data.dto.ImportPlanDto;
import com.example.rusreact2.data.dto.ImportRoomDto;
import com.example.rusreact2.data.enums.EducationForm;
import com.example.rusreact2.data.enums.LessonType;
import com.example.rusreact2.data.models.*;
import com.example.rusreact2.repositories.*;
import com.opencsv.bean.CsvToBean;
import com.opencsv.bean.CsvToBeanBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Component
public class CsvImportRunner implements ApplicationRunner {

    private final DepartmentRepository departmentRepository;
    private final SubjectRepository subjectRepository;
    private final GroupRepository groupRepository;
    private final LecturerRepository lecturerRepository;
    private final PlanRepository planRepository;
    private final RoomRepository roomRepository;

    private static final String CSV_FILE_PLANS_PATH = "static/csvs/plans.csv";
    private static final String CSV_FILE_LECTURERS_PATH = "static/csvs/lecturers.csv";
    private static final String CSV_FILE_ROOMS_PATH = "static/csvs/rooms.csv";

    public CsvImportRunner(
            DepartmentRepository departmentRepository,
            SubjectRepository subjectRepository,
            GroupRepository groupRepository,
            LecturerRepository lecturerRepository,
            PlanRepository planRepository,
            RoomRepository roomRepository
    ) {
        this.departmentRepository = departmentRepository;
        this.subjectRepository = subjectRepository;
        this.groupRepository = groupRepository;
        this.lecturerRepository = lecturerRepository;
        this.planRepository = planRepository;
        this.roomRepository = roomRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        importAll()
                .doOnSubscribe(s -> log.info("=== Запуск реактивного CSV-импорта ==="))
                .doOnTerminate(() -> log.info("=== CSV-импорт завершён ==="))
                .subscribe();
    }

    Mono<Void> importAll() {
        return importPlans()
                .doOnSuccess(v -> log.info("Импорт планов завершён"))
                .onErrorResume(e -> {
                    log.error("Ошибка при импорте планов: {}", e.getMessage(), e);
                    return Mono.empty();
                })
                .then(importLecturers()
                        .doOnSuccess(v -> log.info("Импорт преподавателей завершён"))
                        .onErrorResume(e -> {
                            log.error("Ошибка при импорте преподавателей: {}", e.getMessage(), e);
                            return Mono.empty();
                        }))
                .then(importRooms()
                        .doOnSuccess(v -> log.info("Импорт аудиторий завершён"))
                        .onErrorResume(e -> {
                            log.error("Ошибка при импорте аудиторий: {}", e.getMessage(), e);
                            return Mono.empty();
                        }));
    }

    // ================== Парсинг CSV ==================

    private List<ImportPlanDto> parseCsvPlansFile() throws Exception {
        ClassPathResource resource = new ClassPathResource(CSV_FILE_PLANS_PATH);
        if (!resource.exists()) {
            log.error("CSV файл не найден по пути: {}", CSV_FILE_PLANS_PATH);
            return List.of();
        }
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            CsvToBean<ImportPlanDto> csvToBean = new CsvToBeanBuilder<ImportPlanDto>(reader)
                    .withType(ImportPlanDto.class)
                    .withSeparator(';')
                    .withIgnoreLeadingWhiteSpace(true)
                    .withSkipLines(1)
                    .withIgnoreEmptyLine(true)
                    .build();
            return csvToBean.parse();
        }
    }

    private List<ImportLecturerDto> parseCsvLecturerFile() throws Exception {
        ClassPathResource resource = new ClassPathResource(CSV_FILE_LECTURERS_PATH);
        if (!resource.exists()) {
            log.error("CSV файл не найден по пути: {}", CSV_FILE_LECTURERS_PATH);
            return List.of();
        }
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            CsvToBean<ImportLecturerDto> csvToBean = new CsvToBeanBuilder<ImportLecturerDto>(reader)
                    .withType(ImportLecturerDto.class)
                    .withSeparator(';')
                    .withIgnoreLeadingWhiteSpace(true)
                    .withSkipLines(1)
                    .withIgnoreEmptyLine(true)
                    .build();
            return csvToBean.parse();
        }
    }

    private List<ImportRoomDto> parseCsvRoomFile() throws Exception {
        ClassPathResource resource = new ClassPathResource(CSV_FILE_ROOMS_PATH);
        if (!resource.exists()) {
            log.error("CSV файл не найден по пути: {}", CSV_FILE_ROOMS_PATH);
            return List.of();
        }
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            CsvToBean<ImportRoomDto> csvToBean = new CsvToBeanBuilder<ImportRoomDto>(reader)
                    .withType(ImportRoomDto.class)
                    .withSeparator(';')
                    .withIgnoreLeadingWhiteSpace(true)
                    .withSkipLines(1)
                    .withIgnoreEmptyLine(true)
                    .build();
            return csvToBean.parse();
        }
    }

    // ================== Импорт планов ==================

    Mono<Void> importPlans() {
        return Mono.fromCallable(this::parseCsvPlansFile)
                .filter(records -> !records.isEmpty())
                .switchIfEmpty(Mono.fromRunnable(() -> log.warn("CSV файл планов пуст или не содержит данных")))
                .flatMapMany(Flux::fromIterable)
                .concatMap(this::processPlanRecord)
                .then();
    }

    Mono<Void> processPlanRecord(ImportPlanDto record) {
        return findOrCreateDepartment(record.getDepartmentName())
                .flatMap(department -> findOrCreateSubject(record.getDiscipline(), department.getUuid())
                        .flatMap(subject -> findOrCreateGroup(record)
                                .flatMap(group -> {
                                    int term = resolveTerm(record.getTerm());
                                    LessonType lessonType = parseLessonType(record.getPairKind());
                                    if (lessonType == null) {
                                        return Mono.error(new IllegalStateException("Unexpected pair kind: " + record.getPairKind()));
                                    }
                                    return findOrUpdatePlan(group.getUuid(), subject.getUuid(), term, lessonType,
                                            Integer.parseInt(record.getHours()));
                                })))
                .then()
                .onErrorResume(e -> {
                    log.error("Ошибка импорта записи (group={}): {}", record.getGroupName(), e.getMessage());
                    return Mono.empty();
                });
    }

    // --- Department ---

    Mono<Department> findOrCreateDepartment(String name) {
        return departmentRepository.findByName(name)
                .next()
                .switchIfEmpty(Mono.defer(() -> {
                    Department newDepartment = new Department();
                    newDepartment.setName(name);
                    newDepartment.setRoomUuids(null);
                    newDepartment.setLecturerUuids(null);
                    newDepartment.setSubjectUuids(null);
                    return departmentRepository.save(newDepartment);
                }));
    }

    // --- Subject ---

    Mono<Subject> findOrCreateSubject(String discipline, UUID departmentUuid) {
        return subjectRepository.findByNameAndDepartmentUuid(discipline, departmentUuid)
                .switchIfEmpty(Mono.defer(() -> {
                    Subject newSubject = new Subject();
                    newSubject.setName(discipline);
                    newSubject.setDepartmentUuid(departmentUuid);
                    return subjectRepository.save(newSubject);
                }));
    }

    // --- Group ---

    Mono<Group> findOrCreateGroup(ImportPlanDto record) {
        return groupRepository.findByGroupNameAndSpecializationAndDirection(
                        record.getGroupName(), record.getSpecialization(), record.getDirection())
                .flatMap(existingGroup -> {
                    existingGroup.setCourse(record.getCourse());
                    String kindOfSport = record.getKindOfSport();
                    if (kindOfSport != null && !kindOfSport.trim().isEmpty()) {
                        Set<String> kos = existingGroup.getKindsOfSports();
                        if (kos == null) {
                            kos = new HashSet<>();
                        }
                        kos.add(kindOfSport.trim());
                        existingGroup.setKindsOfSports(kos);
                    }
                    existingGroup.setPairUuids(null);
                    return groupRepository.save(existingGroup);
                })
                .switchIfEmpty(Mono.defer(() -> {
                    EducationForm educationForm = resolveEducationForm(record.getEducationForm());
                    Group newGroup = new Group();
                    newGroup.setGroupName(record.getGroupName());
                    newGroup.setExternalId(record.getExternalId());
                    newGroup.setEducationForm(educationForm);
                    newGroup.setFaculty(record.getFaculty());
                    newGroup.setDirection(record.getDirection());
                    newGroup.setCourse(record.getCourse());
                    newGroup.setSpecialization(record.getSpecialization());
                    String kindOfSport = record.getKindOfSport();
                    if (kindOfSport != null && !kindOfSport.trim().isEmpty()) {
                        newGroup.setKindsOfSports(Set.of(kindOfSport.trim()));
                    } else {
                        newGroup.setKindsOfSports(Set.of());
                    }
                    newGroup.setPairUuids(null);
                    return groupRepository.save(newGroup);
                }));
    }

    // --- Plan ---

    Mono<Plan> findOrUpdatePlan(UUID groupUuid, UUID subjectUuid, int term, LessonType lessonType, int hours) {
        return planRepository.findByGroupUuidAndSubjectUuidAndTermAndLessonType(
                        groupUuid, subjectUuid, term, lessonType)
                .flatMap(existingPlan -> {
                    existingPlan.setHours(hours);
                    return planRepository.save(existingPlan);
                })
                .switchIfEmpty(Mono.defer(() -> {
                    Plan newPlan = new Plan();
                    newPlan.setGroupUuid(groupUuid);
                    newPlan.setSubjectUuid(subjectUuid);
                    newPlan.setTerm(term);
                    newPlan.setLessonType(lessonType);
                    newPlan.setHours(hours);
                    return planRepository.save(newPlan);
                }));
    }

    // ================== Импорт преподавателей ==================

    Mono<Void> importLecturers() {
        return Mono.fromCallable(this::parseCsvLecturerFile)
                .filter(records -> !records.isEmpty())
                .switchIfEmpty(Mono.fromRunnable(() -> log.warn("CSV файл преподавателей пуст или не содержит данных")))
                .flatMapMany(Flux::fromIterable)
                .concatMap(this::processLecturerRecord)
                .then();
    }

    Mono<Void> processLecturerRecord(ImportLecturerDto lecturerDto) {
        String normalizedFio = lecturerDto.getFio()
                .replace('\u00A0', ' ')
                .replace("&nbsp;", " ")
                .replaceAll("\\s+", " ")
                .trim();

        String[] fioSplit = normalizedFio.split(" ");
        if (fioSplit.length < 2) {
            log.warn("Некорректное ФИО: '{}'", lecturerDto.getFio());
            return Mono.empty();
        }
        String lastName = fioSplit[0];
        String firstName = fioSplit[1];
        String patronymic = fioSplit.length > 2 ? fioSplit[2] : "";

        String safeDepartment = lecturerDto.getDepartment()
                .replace('\u00A0', ' ')
                .replace("&nbsp;", " ")
                .replaceAll("\\s+", " ")
                .trim();

        return departmentRepository.findByName(safeDepartment)
                .next()
                .flatMapMany(department ->
                        lecturerRepository.findByLastNameAndFirstNameAndDepartmentUuid(
                                lastName, firstName, department.getUuid()))
                .hasElements()
                .flatMap(exists -> {
                    if (exists) {
                        log.info("Преподаватель найден: {} {} {}", lastName, firstName, lecturerDto.getDepartment());
                        return Mono.empty();
                    }
                    // Не найден — создаём
                    return findOrCreateDepartment(safeDepartment)
                            .flatMap(department -> {
                                Lecturer newLecturer = new Lecturer();
                                newLecturer.setFirstName(firstName);
                                newLecturer.setLastName(lastName);
                                newLecturer.setPatronymic(patronymic);
                                newLecturer.setDepartmentUuid(department.getUuid());
                                newLecturer.setPairUuids(null);
                                return lecturerRepository.save(newLecturer);
                            });
                })
                .then();
    }

    // ================== Импорт аудиторий ==================

    Mono<Void> importRooms() {
        return Mono.fromCallable(this::parseCsvRoomFile)
                .filter(records -> !records.isEmpty())
                .switchIfEmpty(Mono.fromRunnable(() -> log.warn("CSV файл аудиторий пуст или не содержит данных")))
                .flatMapMany(Flux::fromIterable)
                .concatMap(this::processRoomRecord)
                .then();
    }

    Mono<Void> processRoomRecord(ImportRoomDto roomDto) {
        if (roomDto.getRoom() == null || roomDto.getRoom().isBlank()) {
            return Mono.empty();
        }
        return roomRepository.findByTitle(roomDto.getRoom())
                .switchIfEmpty(Mono.defer(() -> {
                    Room newRoom = new Room();
                    newRoom.setTitle(roomDto.getRoom());
                    return roomRepository.save(newRoom);
                }))
                .then();
    }

    // ================== Вспомогательные методы ==================

    private static EducationForm resolveEducationForm(String value) {
        return switch (value.toLowerCase().trim()) {
            case "очная" -> EducationForm.FULL_TIME;
            case "заочная" -> EducationForm.PART_TIME;
            case "очно-заочная" -> EducationForm.MIXED;
            default -> throw new IllegalStateException("Unexpected education form: " + value);
        };
    }

    private static int resolveTerm(String value) {
        return switch (value.toLowerCase().trim()) {
            case "первый семестр", "зимняя сессия первого курса" -> 1;
            case "второй семестр", "летняя сессия первого курса" -> 2;
            case "третий семестр", "зимняя сессия второго курса" -> 3;
            case "четвертый семестр", "летняя сессия второго курса" -> 4;
            case "пятый семестр", "зимняя сессия третьего курса" -> 5;
            case "шестой семестр", "летняя сессия третьего курса" -> 6;
            case "седьмой семестр", "зимняя сессия четвертого курса" -> 7;
            case "восьмой семестр", "летняя сессия четвертого курса" -> 8;
            case "девятый семестр", "зимняя сессия пятого курса" -> 9;
            case "десятый семестр", "летняя сессия пятого курса" -> 10;
            default -> throw new IllegalStateException("Unexpected term: " + value);
        };
    }

    private static LessonType parseLessonType(String s) {
        if (s == null) return null;
        String v = s.trim().toLowerCase(Locale.ROOT);
        if (v.contains("лекц")) return LessonType.LECTURE;
        if (v.contains("практ")) return LessonType.PRACTICE;
        try {
            return LessonType.valueOf(s.trim());
        } catch (Exception ignored) {
        }
        return null;
    }
}
