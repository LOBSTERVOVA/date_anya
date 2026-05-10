package com.example.rusreact2.controllers.mobile;

import com.example.rusreact2.data.dto.ClubDto;
import com.example.rusreact2.data.dto.ClubPageDto;
import com.example.rusreact2.services.ClubService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Set;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mobile/club")
public class MobileClubController {
    private final ClubService clubService;

    @GetMapping("/department/{departmentUuid}")
    public Flux<ClubDto> listByDepartment(@PathVariable UUID departmentUuid) {
        log.info("GET /api/mobile/club/department/{}", departmentUuid);
        return clubService.findByDepartment(departmentUuid);
    }

    @GetMapping
    public Mono<ClubPageDto> listByType(@RequestParam String type,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "12") int size,
                                         @RequestParam(required = false) String search,
                                         @RequestParam(required = false) Set<UUID> departmentUuids,
                                         @RequestParam(required = false) Integer dayOfWeek,
                                         @RequestParam(required = false) String timeFrom,
                                         @RequestParam(required = false) String timeTo) {
        log.info("GET /api/mobile/club?type={}&page={}&size={}", type, page, size);
        return clubService.findAllByType(type, page, size, search, departmentUuids, dayOfWeek, timeFrom, timeTo);
    }

    @GetMapping("/{uuid}")
    public Mono<ClubDto> get(@PathVariable UUID uuid) {
        log.info("GET /api/mobile/club/{}", uuid);
        return clubService.findById(uuid);
    }
}
