package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.CloneRequest;
import com.example.rusreact2.data.dto.CloneResponse;
import com.example.rusreact2.data.dto.PairDto;
import com.example.rusreact2.data.enums.Role;
import com.example.rusreact2.data.models.AppUser;
import com.example.rusreact2.data.models.Pair;
import com.example.rusreact2.services.LecturerService;
import com.example.rusreact2.services.PairService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
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
    private final LecturerService lecturerService;

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
    public Mono<PairDto> savePair(@RequestBody Pair pair, @AuthenticationPrincipal AppUser user) {
        log.info("savePair: uuid={}, date={}, pairOrder={}, subjectUuid={}",
                pair.getUuid(), pair.getDate(), pair.getPairOrder(), pair.getSubjectUuid());
        Role role = user.getRole();
        /// проверка разрешений
        if (role != Role.ADMIN && role != Role.MODERATOR && role != Role.DEPARTMENT_ADMIN)
            return Mono.error(new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Недостаточно прав для данной операции"));

        Set<UUID> lecturerUuids = pair.getLecturerUuids();
        if (lecturerUuids == null || lecturerUuids.isEmpty())
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Не выбран преподаватель"));

        /// загружаем всех преподавателей пары, проверяем права DEPARTMENT_ADMIN
        return Flux.fromIterable(lecturerUuids)
                .flatMap(lecturerService::findByUuid)
                .collectList()
                .flatMap(lecturers -> {
                    if (lecturers.size() != lecturerUuids.size())
                        return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Один или несколько преподавателей не найдены"));

                    if (role == Role.DEPARTMENT_ADMIN) {
                        boolean allSameDept = lecturers.stream()
                                .allMatch(l -> user.getDepartmentUuid().equals(l.getDepartmentUuid()));
                        if (!allSameDept)
                            return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN,
                                    "Вы не имеете прав доступа к этой кафедре"));
                    }
                    return pairService.savePair(pair);
                });
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