package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.PracticeDto;
import com.example.rusreact2.data.models.Practice;
import com.example.rusreact2.services.PracticeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/practice")
public class PracticeController {
    private final PracticeService practiceService;

    /// Создание практики
    @PostMapping
    public Mono<PracticeDto> createPractice(@RequestBody Practice practice) {
        log.info("createPractice: groupUuid={}, type={}, {} – {}",
                practice.getGroupUuid(), practice.getPracticeType(),
                practice.getStartDate(), practice.getEndDate());
        return practiceService.createPractice(practice);
    }

    /// Получить практики для выбранных групп в диапазоне дат
    @GetMapping
    public Flux<PracticeDto> getPractices(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "groupUuids", required = false) List<UUID> groupUuids
    ) {
        log.info("getPractices: from={}, to={}, groups={}", from, to, groupUuids);
        return practiceService.getPractices(groupUuids, from, to);
    }
}
