package com.example.rusreact2.controllers.mobile;

import com.example.rusreact2.data.dto.PairDto;
import com.example.rusreact2.services.PairService;
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
@RequestMapping("/api/mobile/pair")
public class MobilePairController {
    private final PairService pairService;

    @GetMapping("/batch")
    public Flux<PairDto> getActivePairsBatch(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("GET /api/mobile/pair/batch?from={}&to={}", from, to);
        return pairService.getActivePairsBatch(from, to);
    }
    /// Получить ближайшие пары для преподавателя или группы.
    /// GET /api/pair/nearest?uuid=...&type=LECTURER|GROUP
    @GetMapping("/nearest")
    public Flux<PairDto> getNearestPairs(
            @RequestParam UUID uuid,
            @RequestParam String type) {
        log.info("getNearestPairs: uuid={}, type={}", uuid, type);
        return pairService.getNearestPairs(uuid, type);
    }
}
