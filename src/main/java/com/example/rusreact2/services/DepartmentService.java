package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.DepartmentDto;
import com.example.rusreact2.data.dto.LecturerDto;
import com.example.rusreact2.data.dto.RoomDto;
import com.example.rusreact2.data.dto.SubjectDto;
import com.example.rusreact2.data.models.Department;
import com.example.rusreact2.repositories.DepartmentRepository;
import com.example.rusreact2.repositories.LecturerRepository;
import com.example.rusreact2.repositories.RoomRepository;
import com.example.rusreact2.repositories.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
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
                                getLecturersByDepartment(department.getUuid()),
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

    private Mono<Set<LecturerDto>> getLecturersByDepartment(UUID departmentUuid) {
        return lecturerRepository.findByDepartmentUuid(departmentUuid)
                .map(lecturer -> new LecturerDto().minimumLecturerDto(lecturer))
                .collect(HashSet::new, Set::add);
    }

    private Mono<Set<SubjectDto>> getSubjects(UUID departmentUuid) {
        return subjectRepository.findByDepartmentUuid(departmentUuid)
                .map(subject -> new SubjectDto().minimumSubjectDto(subject))
                .collect(HashSet::new, Set::add);
    }

    public Mono<DepartmentDto> findById(UUID uuid) {
        return departmentRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Кафедра не найдена")))
                .flatMap(department ->
                        Mono.zip(
                                getRooms(department.getRoomUuids()),
                                getLecturersByDepartment(department.getUuid()),
                                getSubjects(department.getUuid())
                        ).map(tuple -> new DepartmentDto().fullDepartmentDto(
                                department,
                                tuple.getT1(),
                                tuple.getT2(),
                                tuple.getT3()
                        ))
                );
    }

    public Mono<DepartmentDto> save(Department department) {
        return departmentRepository.save(department)
                .flatMap(saved -> findById(saved.getUuid()));
    }

    public Mono<DepartmentDto> update(Department department) {
        return departmentRepository.findById(department.getUuid())
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Кафедра не найдена")))
                .flatMap(existing -> {
                    existing.setName(department.getName());
                    existing.setDescription(department.getDescription());
                    existing.setRoomUuids(department.getRoomUuids() != null ? department.getRoomUuids() : new HashSet<>());
                    existing.setLecturerUuids(department.getLecturerUuids() != null ? department.getLecturerUuids() : new HashSet<>());
                    existing.setSubjectUuids(department.getSubjectUuids() != null ? department.getSubjectUuids() : new HashSet<>());
                    return departmentRepository.save(existing);
                })
                .flatMap(saved -> findById(saved.getUuid()));
    }
}
