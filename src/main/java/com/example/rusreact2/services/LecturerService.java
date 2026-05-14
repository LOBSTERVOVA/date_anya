package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.DepartmentDto;
import com.example.rusreact2.data.dto.LecturerDto;
import com.example.rusreact2.data.dto.LecturerWorkloadDto;
import com.example.rusreact2.data.models.Lecturer;
import com.example.rusreact2.repositories.DepartmentRepository;
import com.example.rusreact2.repositories.LecturerRepository;
import com.example.rusreact2.repositories.PairRepository;
import com.example.rusreact2.repositories.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LecturerService {
    private final LecturerRepository lecturerRepository;
    private final DepartmentRepository departmentRepository;
    private final PairRepository pairRepository;
    private final SubjectRepository subjectRepository;

    public Mono<Lecturer> findByUuid(UUID uuid) {
        return lecturerRepository.findById(uuid);
    }

    public Flux<LecturerDto> search(String q) {
        return lecturerRepository.search(q)
                .flatMap(lecturer ->
                        departmentRepository.findById(lecturer.getDepartmentUuid())
                                .map(department -> new LecturerDto().fullLecturerDto(
                                        lecturer,
                                        new DepartmentDto().minimumDepartmentDto(department))
                                )
                );
    }

    public Flux<LecturerDto> getAll() {
        return lecturerRepository.findAll()
                .flatMap(lecturer ->
                        departmentRepository.findById(lecturer.getDepartmentUuid())
                                .map(department -> new LecturerDto().fullLecturerDto(
                                        lecturer,
                                        new DepartmentDto().minimumDepartmentDto(department))
                                )
                                .defaultIfEmpty(new LecturerDto().minimumLecturerDto(lecturer))
                );
    }

    /// Преподаватели, не привязанные ни к одной кафедре
    public Flux<LecturerDto> findEligible() {
        return lecturerRepository.findAll()
                .filter(l -> l.getDepartmentUuid() == null)
                .map(l -> new LecturerDto().minimumLecturerDto(l));
    }

    public Mono<LecturerDto> save(Lecturer lecturer) {
        return lecturerRepository.save(lecturer)
                .flatMap(saved -> lecturerRepository.findById(saved.getUuid()))
                .flatMap(l ->
                        departmentRepository.findById(l.getDepartmentUuid())
                                .map(dept -> new LecturerDto().fullLecturerDto(
                                        l,
                                        new DepartmentDto().minimumDepartmentDto(dept))
                                )
                                .defaultIfEmpty(new LecturerDto().minimumLecturerDto(l))
                );
    }

    public Mono<LecturerDto> update(Lecturer lecturer) {
        return lecturerRepository.findById(lecturer.getUuid())
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Преподаватель не найден")))
                .flatMap(existing -> {
                    existing.setFirstName(lecturer.getFirstName());
                    existing.setLastName(lecturer.getLastName());
                    existing.setPatronymic(lecturer.getPatronymic());
                    existing.setAcademicTitle(lecturer.getAcademicTitle());
                    existing.setBirthDate(lecturer.getBirthDate());
                    existing.setAvatar(lecturer.getAvatar());
                    existing.setDescription(lecturer.getDescription());
                    existing.setPhone(lecturer.getPhone());
                    existing.setEmail(lecturer.getEmail());
                    existing.setRoom(lecturer.getRoom());
                    existing.setAcademicDegree(lecturer.getAcademicDegree());
                    existing.setLabHead(lecturer.isLabHead());
                    if (lecturer.getDepartmentUuid() != null) {
                        existing.setDepartmentUuid(lecturer.getDepartmentUuid());
                    }
                    return lecturerRepository.save(existing);
                })
                .flatMap(saved -> lecturerRepository.findById(saved.getUuid()))
                .flatMap(l ->
                        departmentRepository.findById(l.getDepartmentUuid())
                                .map(dept -> new LecturerDto().fullLecturerDto(
                                        l,
                                        new DepartmentDto().minimumDepartmentDto(dept))
                                )
                                .defaultIfEmpty(new LecturerDto().minimumLecturerDto(l))
                );
    }

    public Mono<Void> delete(UUID uuid) {
        return lecturerRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Преподаватель не найден")))
                .flatMap(l -> lecturerRepository.deleteById(uuid));
    }

    /// Назначить заведующим кафедры: снимаем isHead с текущего зава, ставим на нового
    public Mono<LecturerDto> makeHead(UUID uuid) {
        return lecturerRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Преподаватель не найден")))
                .flatMap(lecturer -> {
                    UUID deptUuid = lecturer.getDepartmentUuid();
                    if (deptUuid == null) {
                        return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Преподаватель не привязан к кафедре"));
                    }
                    // Снимаем isHead со всех преподавателей этой кафедры
                    return lecturerRepository.findAll()
                            .filter(l -> deptUuid.equals(l.getDepartmentUuid()) && l.isHead())
                            .flatMap(l -> { l.setHead(false); return lecturerRepository.save(l); })
                            .then(Mono.defer(() -> {
                                lecturer.setHead(true);
                                return lecturerRepository.save(lecturer);
                            }));
                })
                .flatMap(saved -> lecturerRepository.findById(saved.getUuid()))
                .flatMap(l ->
                        departmentRepository.findById(l.getDepartmentUuid())
                                .map(dept -> new LecturerDto().fullLecturerDto(
                                        l,
                                        new DepartmentDto().minimumDepartmentDto(dept))
                                )
                                .defaultIfEmpty(new LecturerDto().minimumLecturerDto(l))
                );
    }

    /// Нагрузка-часы: для каждой пары считаем вклад каждого преподавателя
    public Flux<LecturerWorkloadDto> getWorkload(UUID departmentUuid, LocalDate from, LocalDate to) {
        Mono<Map<UUID, Lecturer>> lecturersMap = lecturerRepository.findByDepartmentUuid(departmentUuid)
                .collect(Collectors.toMap(Lecturer::getUuid, l -> l));

        Flux<com.example.rusreact2.data.models.Pair> pairs = pairRepository
                .findByDateBetweenOrderByDateAscPairOrderAsc(from, to);

        Mono<Map<UUID, String>> subjectNames = subjectRepository.findAll()
                .collect(Collectors.toMap(s -> s.getUuid(), s -> s.getName()));

        return Mono.zip(lecturersMap, subjectNames)
                .flatMapMany(tuple -> {
                    Map<UUID, Lecturer> lecMap = tuple.getT1();
                    Map<UUID, String> subjNames = tuple.getT2();

                    return pairs.collectList().flatMapMany(pairList -> {
                        // lecturerUuid -> { subjectUuid -> Stats }
                        Map<UUID, Map<UUID, int[]>> stats = new LinkedHashMap<>();

                        for (var p : pairList) {
                            Set<UUID> lecs = p.getLecturerUuids();
                            UUID subj = p.getSubjectUuid();
                            if (lecs == null || subj == null) continue;
                            com.example.rusreact2.data.enums.LessonType type = p.getType();
                            int lecAdd = type == com.example.rusreact2.data.enums.LessonType.LECTURE ? 1 : 0;
                            int pracAdd = type == com.example.rusreact2.data.enums.LessonType.PRACTICE ? 1 : 0;
                            int creditAdd = type == com.example.rusreact2.data.enums.LessonType.CREDIT ? 1 : 0;
                            int diffCreditAdd = type == com.example.rusreact2.data.enums.LessonType.DIFFERENTIATED_CREDIT ? 1 : 0;
                            int examAdd = type == com.example.rusreact2.data.enums.LessonType.EXAM ? 1 : 0;
                            for (UUID lecUuid : lecs) {
                                if (!lecMap.containsKey(lecUuid)) continue;
                                int[] arr = stats.computeIfAbsent(lecUuid, k -> new LinkedHashMap<>())
                                        .computeIfAbsent(subj, k -> new int[6]); // [total, lec, prac, credit, diffCredit, exam]
                                arr[0]++;               // total pairs
                                arr[1] += lecAdd;       // lecture pairs
                                arr[2] += pracAdd;      // practice pairs
                                arr[3] += creditAdd;    // credit pairs
                                arr[4] += diffCreditAdd;// differentiated credit pairs
                                arr[5] += examAdd;      // exam pairs
                            }
                        }

                        return Flux.fromIterable(lecMap.values().stream()
                                .sorted(Comparator.comparing(Lecturer::getLastName)
                                        .thenComparing(Lecturer::getFirstName))
                                .toList())
                                .map(lec -> {
                                    LecturerWorkloadDto dto = new LecturerWorkloadDto();
                                    dto.setUuid(lec.getUuid());
                                    dto.setLastName(lec.getLastName());
                                    dto.setFirstName(lec.getFirstName());
                                    dto.setPatronymic(lec.getPatronymic());
                                    dto.setAvatar(lec.getAvatar());
                                    dto.setAcademicTitle(lec.getAcademicTitle());

                                    Map<UUID, int[]> lecStats = stats.getOrDefault(lec.getUuid(), Map.of());
                                    int total = 0, totalLec = 0, totalPrac = 0, totalCredit = 0, totalDiffCredit = 0, totalExam = 0;
                                    List<LecturerWorkloadDto.SubjectStat> subjList = new ArrayList<>();

                                    for (var entry : lecStats.entrySet()) {
                                        UUID subjUuid = entry.getKey();
                                        int[] arr = entry.getValue();
                                        LecturerWorkloadDto.SubjectStat ss = new LecturerWorkloadDto.SubjectStat();
                                        ss.setSubjectName(subjNames.getOrDefault(subjUuid, subjUuid.toString()));
                                        ss.setPairCount(arr[0]);
                                        ss.setHours(arr[0] * 2);
                                        ss.setLecturePairs(arr[1]);
                                        ss.setLectureHours(arr[1] * 2);
                                        ss.setPracticePairs(arr[2]);
                                        ss.setPracticeHours(arr[2] * 2);
                                        ss.setCreditPairs(arr[3]);
                                        ss.setCreditHours(arr[3] * 2);
                                        ss.setDifferentiatedCreditPairs(arr[4]);
                                        ss.setDifferentiatedCreditHours(arr[4] * 2);
                                        ss.setExamPairs(arr[5]);
                                        ss.setExamHours(arr[5] * 2);
                                        subjList.add(ss);
                                        total += arr[0];
                                        totalLec += arr[1];
                                        totalPrac += arr[2];
                                        totalCredit += arr[3];
                                        totalDiffCredit += arr[4];
                                        totalExam += arr[5];
                                    }
                                    subjList.sort(Comparator.comparing(LecturerWorkloadDto.SubjectStat::getPairCount).reversed());

                                    dto.setTotalPairs(total);
                                    dto.setTotalHours(total * 2);
                                    dto.setTotalLecturePairs(totalLec);
                                    dto.setTotalLectureHours(totalLec * 2);
                                    dto.setTotalPracticePairs(totalPrac);
                                    dto.setTotalPracticeHours(totalPrac * 2);
                                    dto.setTotalCreditPairs(totalCredit);
                                    dto.setTotalCreditHours(totalCredit * 2);
                                    dto.setTotalDifferentiatedCreditPairs(totalDiffCredit);
                                    dto.setTotalDifferentiatedCreditHours(totalDiffCredit * 2);
                                    dto.setTotalExamPairs(totalExam);
                                    dto.setTotalExamHours(totalExam * 2);
                                    dto.setSubjects(subjList);
                                    return dto;
                                });
                    });
                });
    }
}
