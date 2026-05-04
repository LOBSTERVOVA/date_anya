package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.LecturerDto;
import com.example.rusreact2.data.dto.LecturerWorkloadDto;
import com.example.rusreact2.data.models.Lecturer;
import com.example.rusreact2.services.LecturerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lecturer")
public class LecturerController {
    private final LecturerService lecturerService;

    @GetMapping
    public Flux<LecturerDto> list(@RequestParam(value = "q", required = false) String q) {
        return lecturerService.search(q);
    }

    @GetMapping("/eligible")
    public Flux<LecturerDto> eligible() {
        return lecturerService.findEligible();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<LecturerDto> create(@RequestBody Lecturer lecturer) {
        return lecturerService.save(lecturer);
    }

    @PutMapping("/{uuid}")
    public Mono<LecturerDto> update(@PathVariable UUID uuid, @RequestBody Lecturer lecturer) {
        lecturer.setUuid(uuid);
        return lecturerService.update(lecturer);
    }

    @DeleteMapping("/{uuid}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID uuid) {
        return lecturerService.delete(uuid);
    }

    @PostMapping("/{uuid}/make-head")
    public Mono<LecturerDto> makeHead(@PathVariable UUID uuid) {
        return lecturerService.makeHead(uuid);
    }

    @GetMapping("/workload")
    public Flux<LecturerWorkloadDto> workload(
            @RequestParam UUID departmentUuid,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("workload: department={}, from={}, to={}", departmentUuid, from, to);
        return lecturerService.getWorkload(departmentUuid, from, to);
    }
}
