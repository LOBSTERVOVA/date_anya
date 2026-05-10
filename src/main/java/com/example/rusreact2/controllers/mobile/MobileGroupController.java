package com.example.rusreact2.controllers.mobile;

import com.example.rusreact2.data.dto.GroupDto;
import com.example.rusreact2.data.dto.GroupWorkloadDto;
import com.example.rusreact2.services.GroupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mobile/group")
public class MobileGroupController {
    private final GroupService groupService;

    @GetMapping("/all")
    public Flux<GroupDto> getAll() {
        log.info("GET /api/mobile/group/all");
        return groupService.getAll();
    }

    @GetMapping("/workload")
    public Flux<GroupWorkloadDto> workload(
            @RequestParam List<UUID> groupUuids,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("GET /api/mobile/group/workload — groups={}, from={}, to={}", groupUuids.size(), from, to);
        return groupService.getWorkload(groupUuids, from, to);
    }
}
