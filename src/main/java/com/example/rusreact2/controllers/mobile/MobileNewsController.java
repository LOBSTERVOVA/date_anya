package com.example.rusreact2.controllers.mobile;

import com.example.rusreact2.data.dto.NewsDto;
import com.example.rusreact2.services.NewsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mobile/news")
public class MobileNewsController {
    private final NewsService newsService;

    @GetMapping
    public Mono<Map<String, Object>> list(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        log.info("GET /api/mobile/news?page={}&size={}", page, size);
        return newsService.findAllPaged(page, size);
    }

    @GetMapping("/{uuid}")
    public Mono<NewsDto> getById(@PathVariable UUID uuid) {
        log.info("GET /api/mobile/news/{}", uuid);
        return newsService.findById(uuid);
    }
}
