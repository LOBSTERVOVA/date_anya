package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.ClubDto;
import com.example.rusreact2.data.models.Club;
import com.example.rusreact2.data.models.ClubSchedule;
import com.example.rusreact2.services.ClubService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/club")
public class ClubController {

    private final ClubService clubService;

    @GetMapping("/department/{departmentUuid}")
    public Flux<ClubDto> listByDepartment(@PathVariable UUID departmentUuid) {
        return clubService.findByDepartment(departmentUuid);
    }

    @GetMapping("/{uuid}")
    public Mono<ClubDto> get(@PathVariable UUID uuid) {
        return clubService.findById(uuid);
    }

    @PostMapping
    public Mono<ClubDto> create(@RequestBody ClubCreateRequest request) {
        log.info("create club: name={}, type={}", request.getClub().getName(), request.getClub().getType());
        return clubService.create(request.getClub(), request.getSchedules());
    }

    @PutMapping("/{uuid}")
    public Mono<ClubDto> update(@PathVariable UUID uuid, @RequestBody ClubCreateRequest request) {
        log.info("update club: uuid={}, name={}", uuid, request.getClub().getName());
        return clubService.update(uuid, request.getClub(), request.getSchedules());
    }

    @DeleteMapping("/{uuid}")
    public Mono<Void> delete(@PathVariable UUID uuid) {
        return clubService.delete(uuid);
    }
}
