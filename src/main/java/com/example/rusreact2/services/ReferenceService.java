package com.example.rusreact2.services;

import com.example.rusreact2.data.models.MonthDayRange;
import com.example.rusreact2.data.models.ReferenceInfo;
import com.example.rusreact2.data.models.ReferenceMedia;
import com.example.rusreact2.repositories.MonthDayRangeRepository;
import com.example.rusreact2.repositories.ReferenceInfoRepository;
import com.example.rusreact2.repositories.ReferenceMediaRepository;
import com.example.rusreact2.repositories.ThemeCount;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReferenceService {
    private final ReferenceInfoRepository refRepo;
    private final MonthDayRangeRepository mdrRepo;
    private final ReferenceMediaRepository mediaRepo;
    private final MinioService minioService;

    public Flux<ReferenceInfo> getAll() {
        return refRepo.findAll()
                .flatMap(this::attachActualDates)
                .collectList()
                .flatMapMany(this::attachMediaFilesBatch);
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
                .flatMap(this::attachActualDates)
                .collectList()
                .flatMapMany(this::attachMediaFilesBatch);
    }

    public Mono<ReferenceInfo> findById(UUID uuid) {
        return refRepo.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Справка с uuid " + uuid + " не найдена")))
                .flatMap(this::attachActualDates)
                .flatMap(this::attachMediaFiles);
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
                            .then(attachActualDates(saved))
                            .flatMap(this::attachMediaFiles));
        } else {
            ref.setCreatedAt(now);
            ref.setUpdatedAt(now);
            return refRepo.save(ref)
                    .flatMap(saved -> replaceActualDates(saved.getUuid(), ref.getActualDates())
                            .then(attachActualDates(saved))
                            .flatMap(this::attachMediaFiles));
        }
    }

    public Mono<Void> delete(UUID uuid) {
        return refRepo.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Справка с uuid " + uuid + " не найдена")))
                .flatMap(n -> mdrRepo.deleteByReferenceUuid(uuid))
                .then(deleteAllMediaFiles(uuid))
                .then(mediaRepo.deleteByReferenceUuid(uuid))
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

    // --- media helpers ---

    /// Прикрепляет медиафайлы к списку справок одним batch-запросом (без N+1)
    private Flux<ReferenceInfo> attachMediaFilesBatch(List<ReferenceInfo> refs) {
        if (refs == null || refs.isEmpty()) return Flux.empty();
        Set<UUID> uuids = refs.stream()
                .map(ReferenceInfo::getUuid)
                .collect(Collectors.toSet());
        return mediaRepo.findByReferenceUuids(uuids)
                .collectMultimap(ReferenceMedia::getReferenceUuid)
                .map(mediaMap -> {
                    for (ReferenceInfo ref : refs) {
                        Collection<ReferenceMedia> media = mediaMap.get(ref.getUuid());
                        ref.setMediaFiles(media != null && !media.isEmpty()
                                ? List.copyOf(media)
                                : List.of());
                    }
                    return refs;
                })
                .flatMapMany(Flux::fromIterable);
    }

    /// Прикрепляет список медиафайлов к одной ReferenceInfo (для findById/save)
    private Mono<ReferenceInfo> attachMediaFiles(ReferenceInfo ref) {
        if (ref == null) return Mono.empty();
        return mediaRepo.findByReferenceUuid(ref.getUuid())
                .collectList()
                .map(media -> {
                    ref.setMediaFiles(media.isEmpty() ? List.of() : media);
                    return ref;
                })
                .defaultIfEmpty(ref);
    }

    /// Загружает один медиафайл в MinIO и сохраняет запись в БД
    public Mono<ReferenceMedia> uploadMedia(UUID refUuid, FilePart filePart) {
        return refRepo.findById(refUuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Справка с uuid " + refUuid + " не найдена")))
                .flatMap(ref -> {
                    String originalName = filePart.filename();
                    String path = "reference-media/" + refUuid + "/";
                    String contentType = filePart.headers().getContentType() != null
                            ? filePart.headers().getContentType().toString()
                            : "application/octet-stream";
                    long fileSize = filePart.headers().getContentLength();

                    return DataBufferUtils.join(filePart.content())
                            .publishOn(Schedulers.boundedElastic())
                            .map(buffer -> {
                                byte[] bytes = new byte[buffer.readableByteCount()];
                                buffer.read(bytes);
                                DataBufferUtils.release(buffer);
                                return bytes;
                            })
                            .map(bytes -> {
                                String storagePath = minioService.uploadStream(
                                        new ByteArrayInputStream(bytes),
                                        originalName,
                                        path,
                                        contentType);
                                if (storagePath == null || storagePath.isEmpty()) {
                                    throw new ResponseStatusException(
                                            HttpStatus.INTERNAL_SERVER_ERROR, "Не удалось загрузить файл в MinIO");
                                }
                                ReferenceMedia media = new ReferenceMedia();
                                media.setReferenceUuid(refUuid);
                                media.setFileName(originalName);
                                media.setStoragePath(storagePath);
                                media.setContentType(contentType);
                                media.setFileSize(fileSize);
                                media.setCreatedAt(LocalDateTime.now());
                                return media;
                            })
                            .flatMap(mediaRepo::save);
                });
    }

    /// Удаляет один медиафайл (из MinIO и БД)
    public Mono<Void> deleteMedia(UUID mediaUuid) {
        return mediaRepo.findById(mediaUuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Медиафайл с uuid " + mediaUuid + " не найден")))
                .flatMap(media -> {
                    minioService.deleteFile(media.getStoragePath());
                    return mediaRepo.deleteById(mediaUuid);
                });
    }

    /// Получить все медиафайлы справки
    public Flux<ReferenceMedia> getMediaFiles(UUID refUuid) {
        return mediaRepo.findByReferenceUuid(refUuid);
    }

    /// Удалить все файлы справки из MinIO (без удаления записей из БД)
    private Mono<Void> deleteAllMediaFiles(UUID refUuid) {
        return mediaRepo.findByReferenceUuid(refUuid)
                .flatMap(media -> {
                    minioService.deleteFile(media.getStoragePath());
                    return Mono.empty();
                })
                .then();
    }
}
