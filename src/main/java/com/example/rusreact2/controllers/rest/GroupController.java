package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.GroupDto;
import com.example.rusreact2.data.dto.GroupWorkloadDto;
import com.example.rusreact2.data.models.Group;
import com.example.rusreact2.services.GroupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/group")
public class GroupController {
    private final GroupService groupService;

    @GetMapping
    public Flux<GroupDto> list(@RequestParam(value = "q", required = false) String q) {
        return groupService.search(q);
    }

    @PostMapping
    public Mono<GroupDto> create(@RequestBody Group group) {
        log.info("POST /api/group — groupName={}, course={}", group.getGroupName(), group.getCourse());
        return groupService.save(group);
    }

    @GetMapping("/faculties")
    public Flux<String> faculties() {
        log.info("GET /api/group/faculties");
        return groupService.getFaculties();
    }

    @GetMapping("/workload")
    public Flux<GroupWorkloadDto> workload(
            @RequestParam List<UUID> groupUuids,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("GET /api/group/workload — groups={}, from={}, to={}", groupUuids.size(), from, to);
        return groupService.getWorkload(groupUuids, from, to);
    }
}
