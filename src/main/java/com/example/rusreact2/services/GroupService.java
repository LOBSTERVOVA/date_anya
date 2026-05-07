package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.GroupDto;
import com.example.rusreact2.data.dto.GroupWorkloadDto;
import com.example.rusreact2.data.dto.PracticeDto;
import com.example.rusreact2.data.enums.LessonType;
import com.example.rusreact2.data.models.Group;
import com.example.rusreact2.data.models.Pair;
import com.example.rusreact2.data.models.Practice;
import com.example.rusreact2.repositories.DepartmentRepository;
import com.example.rusreact2.repositories.GroupRepository;
import com.example.rusreact2.repositories.PairRepository;
import com.example.rusreact2.repositories.PracticeRepository;
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
public class GroupService {
    private final GroupRepository groupRepository;
    private final DepartmentRepository departmentRepository;
    private final PairRepository pairRepository;
    private final PracticeRepository practiceRepository;
    private final SubjectRepository subjectRepository;

    public Flux<GroupDto> search(String query) {
        return groupRepository.search(query)
                .map(group -> new GroupDto().minimumGroupDto(group));
    }

    public Flux<GroupDto> getAll() {
        return groupRepository.findAll()
                .map(group -> new GroupDto().minimumGroupDto(group));
    }

    public Mono<GroupDto> save(Group group) {
        if (group.getGroupName() == null || group.getGroupName().isBlank()) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Название группы обязательно"));
        }
        if (group.getCourse() < 1 || group.getCourse() > 6) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Курс должен быть от 1 до 6"));
        }
        if (group.getEducationForm() == null) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Форма обучения обязательна"));
        }
        if (group.getDirection() == null || group.getDirection().isBlank()) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Направление обязательно"));
        }
        if (group.getFaculty() == null || group.getFaculty().isBlank()) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Факультет обязателен"));
        }
        group.setPairUuids(null);
        return groupRepository.save(group)
                .map(saved -> new GroupDto().minimumGroupDto(saved));
    }

    public Flux<String> getFaculties() {
        return groupRepository.findDistinctFaculties()
                .mergeWith(departmentRepository.findAll()
                        .map(d -> d.getName())
                        .filter(name -> name != null && !name.isBlank()))
                .distinct()
                .sort();
    }

    /// Нагрузка групп: пары + практики за период
    public Flux<GroupWorkloadDto> getWorkload(List<UUID> groupUuids, LocalDate from, LocalDate to) {
        if (groupUuids == null || groupUuids.isEmpty()) {
            return Flux.empty();
        }

        Mono<Map<UUID, Group>> groupsMap = groupRepository.findAll()
                .filter(g -> groupUuids.contains(g.getUuid()))
                .collect(Collectors.toMap(Group::getUuid, g -> g));

        Mono<Map<UUID, String>> subjectNames = subjectRepository.findAll()
                .collect(Collectors.toMap(s -> s.getUuid(), s -> s.getName()));

        Flux<Pair> pairs = pairRepository.findByGroupUuidsAndDateBetweenAll(groupUuids, from, to);

        Mono<List<Practice>> practices = practiceRepository
                .findByGroupUuidsAndDateOverlap(groupUuids, from, to)
                .collectList();

        return Mono.zip(groupsMap, subjectNames, pairs.collectList(), practices)
                .flatMapMany(tuple -> {
                    Map<UUID, Group> grpMap = tuple.getT1();
                    Map<UUID, String> subjNames = tuple.getT2();
                    List<Pair> pairList = tuple.getT3();
                    List<Practice> practiceList = tuple.getT4();

                    // groupUuid -> { subjectUuid -> int[6] }  [total, lec, prac, credit, diffCredit, exam]
                    Map<UUID, Map<UUID, int[]>> stats = new LinkedHashMap<>();

                    for (Pair p : pairList) {
                        Set<UUID> groupUuidsOfPair = p.getGroupUuids();
                        UUID subj = p.getSubjectUuid();
                        if (groupUuidsOfPair == null || subj == null) continue;

                        LessonType type = p.getType();
                        int lecAdd = type == LessonType.LECTURE ? 1 : 0;
                        int pracAdd = type == LessonType.PRACTICE ? 1 : 0;
                        int creditAdd = type == LessonType.CREDIT ? 1 : 0;
                        int diffCreditAdd = type == LessonType.DIFFERENTIATED_CREDIT ? 1 : 0;
                        int examAdd = type == LessonType.EXAM ? 1 : 0;

                        for (UUID gUuid : groupUuidsOfPair) {
                            if (!grpMap.containsKey(gUuid)) continue;
                            int[] arr = stats.computeIfAbsent(gUuid, k -> new LinkedHashMap<>())
                                    .computeIfAbsent(subj, k -> new int[6]);
                            arr[0]++;
                            arr[1] += lecAdd;
                            arr[2] += pracAdd;
                            arr[3] += creditAdd;
                            arr[4] += diffCreditAdd;
                            arr[5] += examAdd;
                        }
                    }

                    // Группируем практики по groupUuid
                    Map<UUID, List<Practice>> practicesByGroup = new LinkedHashMap<>();
                    for (Practice pr : practiceList) {
                        practicesByGroup.computeIfAbsent(pr.getGroupUuid(), k -> new ArrayList<>()).add(pr);
                    }

                    return Flux.fromIterable(grpMap.values().stream()
                            .sorted(Comparator.comparing(Group::getGroupName, String.CASE_INSENSITIVE_ORDER))
                            .toList())
                            .map(group -> {
                                GroupWorkloadDto dto = new GroupWorkloadDto();
                                dto.setUuid(group.getUuid());
                                dto.setGroupName(group.getGroupName());
                                dto.setCourse(group.getCourse());
                                dto.setEducationForm(group.getEducationForm());
                                dto.setFaculty(group.getFaculty());
                                dto.setDirection(group.getDirection());
                                dto.setSpecialization(group.getSpecialization());
                                dto.setKindsOfSports(group.getKindsOfSports());

                                Map<UUID, int[]> grpStats = stats.getOrDefault(group.getUuid(), Map.of());
                                int total = 0, totalLec = 0, totalPrac = 0, totalCredit = 0, totalDiffCredit = 0, totalExam = 0;
                                List<GroupWorkloadDto.SubjectStat> subjList = new ArrayList<>();

                                for (var entry : grpStats.entrySet()) {
                                    UUID subjUuid = entry.getKey();
                                    int[] arr = entry.getValue();
                                    GroupWorkloadDto.SubjectStat ss = new GroupWorkloadDto.SubjectStat();
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
                                subjList.sort(Comparator.comparing(GroupWorkloadDto.SubjectStat::getPairCount).reversed());

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

                                // Практики группы
                                List<Practice> grpPractices = practicesByGroup.getOrDefault(group.getUuid(), List.of());
                                dto.setPractices(grpPractices.stream()
                                        .sorted(Comparator.comparing(Practice::getStartDate))
                                        .map(PracticeDto::from)
                                        .toList());

                                return dto;
                            });
                });
    }
}
