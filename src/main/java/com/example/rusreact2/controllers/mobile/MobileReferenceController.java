package com.example.rusreact2.controllers.mobile;

import com.example.rusreact2.data.models.ReferenceInfo;
import com.example.rusreact2.data.models.ReferenceMedia;
import com.example.rusreact2.services.ReferenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mobile/reference")
public class MobileReferenceController {
    private final ReferenceService referenceService;
    private final ReferenceService refService;

    @GetMapping
    public Flux<ReferenceInfo> getAll() {
        log.info("GET /api/mobile/reference");
        return referenceService.getAll();
    }
    @GetMapping("/{uuid}/media")
    public Mono<List<ReferenceMedia>> getMedia(@PathVariable UUID uuid) {
        log.info("GET /api/reference/{}/media", uuid);
        return refService.getMediaFiles(uuid).collectList();
    }
}
