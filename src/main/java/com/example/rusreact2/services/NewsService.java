package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.NewsDto;
import com.example.rusreact2.data.models.News;
import com.example.rusreact2.repositories.NewsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NewsService {
    private final NewsRepository newsRepository;

    /// Сохранение новости (создание или редактирование):
    /// - если uuid отсутствует — создание (createdAt = now)
    /// - если uuid передан — редактирование (updatedAt = now)
    public Mono<NewsDto> saveNews(News news) {
        boolean isUpdate = news.getUuid() != null;
        LocalDateTime now = LocalDateTime.now();

        if (isUpdate) {
            return newsRepository.findById(news.getUuid())
                    .switchIfEmpty(Mono.error(new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Новость с uuid " + news.getUuid() + " не найдена")))
                    .flatMap(existing -> {
                        existing.setTitle(news.getTitle());
                        existing.setHtmlContent(news.getHtmlContent());
                        existing.setMainPhotoUrl(news.getMainPhotoUrl());
                        existing.setGalleryPhotos(news.getGalleryPhotos());
                        existing.setType(news.getType());
                        existing.setUpdatedAt(now);
                        return newsRepository.save(existing);
                    })
                    .map(saved -> new NewsDto().minimumNewsDto(saved));
        } else {
            news.setCreatedAt(now);
            news.setUpdatedAt(now);
            return newsRepository.save(news)
                    .map(saved -> new NewsDto().minimumNewsDto(saved));
        }
    }

    /// Пагинированный список новостей (свежие сверху)
    /// Возвращает Map с ключами: "items" — список NewsDto, "total" — общее количество
    public Mono<Map<String, Object>> findAllPaged(int page, int size) {
        int offset = page * size;
        Flux<NewsDto> itemsFlux = newsRepository.findAllPaged(size, offset)
                .map(news -> new NewsDto().minimumNewsDto(news));

        Mono<Long> totalMono = newsRepository.countAll();

        return Mono.zip(itemsFlux.collectList(), totalMono)
                .map(tuple -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("items", tuple.getT1());
                    result.put("total", tuple.getT2());
                    return result;
                });
    }

    public Mono<NewsDto> findById(UUID uuid) {
        return newsRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Новость с uuid " + uuid + " не найдена")))
                .map(news -> new NewsDto().minimumNewsDto(news));
    }

    public Mono<Void> delete(UUID uuid) {
        return newsRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Новость с uuid " + uuid + " не найдена")))
                .flatMap(n -> newsRepository.deleteById(uuid));
    }
}
