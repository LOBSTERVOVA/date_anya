package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.DepartmentDto;
import com.example.rusreact2.data.dto.LecturerDto;
import com.example.rusreact2.data.dto.RoomDto;
import com.example.rusreact2.data.dto.SubjectDto;
import com.example.rusreact2.repositories.DepartmentRepository;
import com.example.rusreact2.repositories.LecturerRepository;
import com.example.rusreact2.repositories.RoomRepository;
import com.example.rusreact2.repositories.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DepartmentService {
    private final DepartmentRepository departmentRepository;
    private final RoomRepository roomRepository;
    private final LecturerRepository lecturerRepository;
    private final SubjectRepository subjectRepository;

    public Flux<DepartmentDto> search(String q) {
        return departmentRepository.search(q)
                .flatMap(department ->
                        Mono.zip(
                                getRooms(department.getRoomUuids()),
                                getLecturers(department.getLecturerUuids()),
                                getSubjects(department.getUuid())
                        ).map(tuple -> new DepartmentDto().fullDepartmentDto(
                                department,
                                tuple.getT1(),
                                tuple.getT2(),
                                tuple.getT3()
                        ))
                );
    }

    private Mono<Set<RoomDto>> getRooms(Set<UUID> uuids) {
        if (uuids == null || uuids.isEmpty()) return Mono.just(new HashSet<>());
        return Flux.fromIterable(uuids)
                .flatMap(roomRepository::findById)
                .map(room -> new RoomDto(room.getUuid(), room.getTitle()))
                .collect(HashSet::new, Set::add);
    }

    private Mono<Set<LecturerDto>> getLecturers(Set<UUID> uuids) {
        if (uuids == null || uuids.isEmpty()) return Mono.just(new HashSet<>());
        return Flux.fromIterable(uuids)
                .flatMap(lecturerRepository::findById)
                .map(lecturer -> new LecturerDto().minimumLecturerDto(lecturer))
                .collect(HashSet::new, Set::add);
    }

    private Mono<Set<SubjectDto>> getSubjects(UUID departmentUuid) {
        return subjectRepository.findByDepartmentUuid(departmentUuid)
                .map(subject -> new SubjectDto().minimumSubjectDto(subject))
                .collect(HashSet::new, Set::add);
    }
}
