package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.models.ReferenceInfo;
import com.example.rusreact2.data.models.ReferenceMedia;
import com.example.rusreact2.services.ReferenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/reference")
public class ReferenceController {
    private final ReferenceService refService;

    @GetMapping("/themes")
    public Mono<List<String>> themes() {
        log.info("GET /api/reference/themes");
        return refService.getDistinctThemes().collectList();
    }

    @GetMapping("/themes/counts")
    public Mono<Map<String, Long>> themeCounts() {
        log.info("GET /api/reference/themes/counts");
        return refService.getThemeCounts();
    }

    @GetMapping
    public Mono<List<ReferenceInfo>> list(@RequestParam(value = "theme", required = false) String theme) {
        log.info("GET /api/reference?theme={}", theme);
        if (theme != null && !theme.isEmpty()) {
            return refService.findByTheme(theme).collectList();
        }
        return Mono.just(List.of());
    }

    @GetMapping("/{uuid}")
    public Mono<ReferenceInfo> getById(@PathVariable UUID uuid) {
        log.info("GET /api/reference/{}", uuid);
        return refService.findById(uuid);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ReferenceInfo> create(@RequestBody ReferenceInfo ref) {
        log.info("POST /api/reference: theme={}, title={}", ref.getTheme(), ref.getTitle());
        return refService.save(ref);
    }

    @PutMapping("/{uuid}")
    public Mono<ReferenceInfo> update(@PathVariable UUID uuid, @RequestBody ReferenceInfo ref) {
        log.info("PUT /api/reference/{}: theme={}, title={}", uuid, ref.getTheme(), ref.getTitle());
        ref.setUuid(uuid);
        return refService.save(ref);
    }

    @DeleteMapping("/{uuid}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID uuid) {
        log.info("DELETE /api/reference/{}", uuid);
        return refService.delete(uuid);
    }

    // --- медиафайлы ---

    /// Загрузка медиафайла для существующей справки
    @PostMapping("/{uuid}/media")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ReferenceMedia> uploadMedia(@PathVariable UUID uuid,
                                            @RequestPart("file") FilePart file) {
        log.info("POST /api/reference/{}/media: fileName={}, contentType={}",
                uuid, file.filename(), file.headers().getContentType());
        return refService.uploadMedia(uuid, file);
    }

    /// Список медиафайлов справки
    @GetMapping("/{uuid}/media")
    public Mono<List<ReferenceMedia>> getMedia(@PathVariable UUID uuid) {
        log.info("GET /api/reference/{}/media", uuid);
        return refService.getMediaFiles(uuid).collectList();
    }

    /// Удаление одного медиафайла
    @DeleteMapping("/{uuid}/media/{mediaUuid}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteMedia(@PathVariable UUID uuid, @PathVariable UUID mediaUuid) {
        log.info("DELETE /api/reference/{}/media/{}", uuid, mediaUuid);
        return refService.deleteMedia(mediaUuid);
    }
}
