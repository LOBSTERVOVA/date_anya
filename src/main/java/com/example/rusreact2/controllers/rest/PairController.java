package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.PairDto;
import com.example.rusreact2.data.models.Pair;
import com.example.rusreact2.services.PairService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.time.LocalDate;

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

    @PostMapping
    public Mono<PairDto> createPair(@RequestBody Pair pair) {
        log.info("createPair: date={}, pairOrder={}, subjectUuid={}", pair.getDate(), pair.getPairOrder(), pair.getSubjectUuid());
        return pairService.createPair(pair);
    }

}