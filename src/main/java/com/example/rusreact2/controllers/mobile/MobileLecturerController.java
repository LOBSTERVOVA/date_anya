package com.example.rusreact2.controllers.mobile;

import com.example.rusreact2.data.dto.LecturerDto;
import com.example.rusreact2.data.dto.LecturerWorkloadDto;
import com.example.rusreact2.services.LecturerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mobile/lecturer")
public class MobileLecturerController {
    private final LecturerService lecturerService;

    @GetMapping("/all")
    public Flux<LecturerDto> getAll() {
        log.info("GET /api/mobile/lecturer/all");
        return lecturerService.getAll();
    }

    @GetMapping("/workload")
    public Flux<LecturerWorkloadDto> workload(
            @RequestParam UUID departmentUuid,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("GET /api/mobile/lecturer/workload — department={}, from={}, to={}", departmentUuid, from, to);
        return lecturerService.getWorkload(departmentUuid, from, to);
    }
}
