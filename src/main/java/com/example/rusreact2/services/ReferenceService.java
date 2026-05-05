package com.example.rusreact2.services;

import com.example.rusreact2.data.models.MonthDayRange;
import com.example.rusreact2.data.models.ReferenceInfo;
import com.example.rusreact2.repositories.MonthDayRangeRepository;
import com.example.rusreact2.repositories.ReferenceInfoRepository;
import com.example.rusreact2.repositories.ThemeCount;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReferenceService {
    private final ReferenceInfoRepository refRepo;
    private final MonthDayRangeRepository mdrRepo;

    public Flux<ReferenceInfo> getAll() {
        return refRepo.findAll()
                .flatMap(this::attachActualDates);
    }

    public Flux<String> getDistinctThemes() {
        return refRepo.findDistinctThemes();
    }

    public Mono<Map<String, Long>> getThemeCounts() {
        return refRepo.findThemeCounts()
                .collectMap(ThemeCount::getTheme, ThemeCount::getCnt);
    }

    public Flux<ReferenceInfo> findByTheme(String theme) {
        return refRepo.findByTheme(theme)
                .flatMap(this::attachActualDates);
    }

    public Mono<ReferenceInfo> findById(UUID uuid) {
        return refRepo.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Справка с uuid " + uuid + " не найдена")))
                .flatMap(this::attachActualDates);
    }

    @Transactional
    public Mono<ReferenceInfo> save(ReferenceInfo ref) {
        boolean isUpdate = ref.getUuid() != null;
        LocalDateTime now = LocalDateTime.now();

        if (isUpdate) {
            return refRepo.findById(ref.getUuid())
                    .switchIfEmpty(Mono.error(new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Справка с uuid " + ref.getUuid() + " не найдена")))
                    .flatMap(existing -> {
                        existing.setTheme(ref.getTheme());
                        existing.setImportanceLevel(ref.getImportanceLevel());
                        existing.setTitle(ref.getTitle());
                        existing.setAnnotation(ref.getAnnotation());
                        existing.setHtmlText(ref.getHtmlText());
                        existing.setUpdatedAt(now);
                        return refRepo.save(existing);
                    })
                    .flatMap(saved -> replaceActualDates(saved.getUuid(), ref.getActualDates())
                            .then(attachActualDates(saved)));
        } else {
            ref.setCreatedAt(now);
            ref.setUpdatedAt(now);
            return refRepo.save(ref)
                    .flatMap(saved -> replaceActualDates(saved.getUuid(), ref.getActualDates())
                            .then(attachActualDates(saved)));
        }
    }

    public Mono<Void> delete(UUID uuid) {
        return refRepo.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Справка с uuid " + uuid + " не найдена")))
                .flatMap(n -> mdrRepo.deleteByReferenceUuid(uuid))
                .then(refRepo.deleteById(uuid));
    }

    // --- helpers ---

    private Mono<ReferenceInfo> attachActualDates(ReferenceInfo ref) {
        if (ref == null) return Mono.empty();
        return mdrRepo.findByReferenceUuid(ref.getUuid())
                .collectList()
                .map(dates -> {
                    ref.setActualDates(dates.isEmpty() ? List.of() : dates);
                    return ref;
                })
                .defaultIfEmpty(ref);
    }

    private Mono<Void> replaceActualDates(UUID refUuid, List<MonthDayRange> newDates) {
        return mdrRepo.deleteByReferenceUuid(refUuid)
                .then(Mono.defer(() -> {
                    if (newDates == null || newDates.isEmpty()) return Mono.empty();
                    List<MonthDayRange> toSave = newDates.stream()
                            .map(d -> {
                                MonthDayRange m = new MonthDayRange();
                                m.setReferenceUuid(refUuid);
                                m.setStartMonth(d.getStartMonth());
                                m.setStartDay(d.getStartDay());
                                m.setEndMonth(d.getEndMonth());
                                m.setEndDay(d.getEndDay());
                                m.setCreatedAt(LocalDateTime.now());
                                return m;
                            }).collect(Collectors.toList());
                    return mdrRepo.saveAll(toSave).then();
                }));
    }
}
