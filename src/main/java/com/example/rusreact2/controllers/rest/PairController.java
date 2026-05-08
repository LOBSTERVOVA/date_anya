package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.CloneRequest;
import com.example.rusreact2.data.dto.CloneResponse;
import com.example.rusreact2.data.dto.PairDto;
import com.example.rusreact2.data.models.Pair;
import com.example.rusreact2.services.PairService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pair")
public class PairController {
    private final PairService pairService;

    @GetMapping("/week/batch")
    public Flux<PairDto> getWeekPairsBatch(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("getWeekPairsBatch start: {}, end: {}", from, to);
        return pairService.getWeekPairsBatch(from, to);
    }

    /// Создание или редактирование пары:
    /// - если uuid не передан — создание новой пары
    /// - если uuid передан — редактирование существующей
    @PostMapping
    public Mono<PairDto> savePair(@RequestBody Pair pair) {
        log.info("savePair: uuid={}, date={}, pairOrder={}, subjectUuid={}",
                pair.getUuid(), pair.getDate(), pair.getPairOrder(), pair.getSubjectUuid());
        return pairService.savePair(pair);
    }

    @DeleteMapping("/{uuid}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deletePair(@PathVariable UUID uuid) {
        log.info("deletePair: uuid={}", uuid);
        return pairService.deletePair(uuid);
    }

    @PostMapping("/approve")
    public Mono<Integer> approvePairs(@RequestBody Map<String, Set<UUID>> body) {
        Set<UUID> departmentUuids = body.getOrDefault("departmentUuids", Set.of());
        log.info("approvePairs: departments={}", departmentUuids);
        if (departmentUuids.isEmpty()) return Mono.just(0);
        return pairService.approvePairs(departmentUuids);
    }

    @PostMapping("/clone")
    public Mono<CloneResponse> cloneWeek(@RequestBody CloneRequest request) {
        log.info("cloneWeek: departmentUuid={}, sourceDate={}, targetDate={}, lecturers={}, days={}",
                request.getDepartmentUuid(), request.getSourceDate(), request.getTargetDate(),
                request.getLecturerUuids(), request.getDaysOfWeek());
        return pairService.cloneWeek(request);
    }

}