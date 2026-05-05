package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.GroupDto;
import com.example.rusreact2.data.models.Group;
import com.example.rusreact2.repositories.GroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class GroupService {
    private final GroupRepository groupRepository;

    public Flux<GroupDto> search(String query) {
        return groupRepository.search(query)
                .map(group -> new GroupDto().minimumGroupDto(group));
    }

    public Flux<GroupDto> getAll() {
        return groupRepository.findAll()
                .map(group -> new GroupDto().minimumGroupDto(group));
    }
}
