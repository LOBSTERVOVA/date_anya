package com.example.rusreact2.controllers.mobile;

import com.example.rusreact2.data.dto.PracticeDto;
import com.example.rusreact2.services.PracticeService;
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
@RequestMapping("/api/mobile/practice")
public class MobilePracticeController {
    private final PracticeService practiceService;

    @GetMapping
    public Flux<PracticeDto> getPractices(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "groupUuids", required = false) List<UUID> groupUuids
    ) {
        log.info("GET /api/mobile/practice?from={}&to={}&groupUuids={}", from, to, groupUuids);
        return practiceService.getPractices(groupUuids, from, to);
    }
}
