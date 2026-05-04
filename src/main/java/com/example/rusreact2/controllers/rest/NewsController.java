package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.NewsDto;
import com.example.rusreact2.data.models.News;
import com.example.rusreact2.services.NewsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/news")
public class NewsController {
    private final NewsService newsService;

    /// Пагинированный список новостей
    @GetMapping
    public Mono<Map<String, Object>> list(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        log.info("list news: page={}, size={}", page, size);
        return newsService.findAllPaged(page, size);
    }

    @GetMapping("/{uuid}")
    public Mono<NewsDto> getById(@PathVariable UUID uuid) {
        log.info("get news by uuid: {}", uuid);
        return newsService.findById(uuid);
    }

    /// Создание или редактирование новости:
    /// - если uuid не передан — создание
    /// - если uuid передан — редактирование
    @PostMapping
    public Mono<NewsDto> save(@RequestBody News news) {
        log.info("save news: uuid={}, title={}, type={}", news.getUuid(), news.getTitle(), news.getType());
        return newsService.saveNews(news);
    }

    @DeleteMapping("/{uuid}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID uuid) {
        log.info("delete news: uuid={}", uuid);
        return newsService.delete(uuid);
    }
}
