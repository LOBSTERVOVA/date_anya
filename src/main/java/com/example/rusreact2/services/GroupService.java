package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.GroupDto;
import com.example.rusreact2.data.models.Group;
import com.example.rusreact2.repositories.DepartmentRepository;
import com.example.rusreact2.repositories.GroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class GroupService {
    private final GroupRepository groupRepository;
    private final DepartmentRepository departmentRepository;

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
}
