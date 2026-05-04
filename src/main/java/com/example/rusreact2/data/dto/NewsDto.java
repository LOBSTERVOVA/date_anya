package com.example.rusreact2.data.dto;

import com.example.rusreact2.data.enums.NewsType;
import com.example.rusreact2.data.models.News;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class NewsDto {
    UUID uuid;
    String title;
    String htmlContent;
    NewsType type;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    public NewsDto minimumNewsDto(News news) {
        NewsDto dto = new NewsDto();
        dto.uuid = news.getUuid();
        dto.title = news.getTitle();
        dto.htmlContent = news.getHtmlContent();
        dto.type = news.getType();
        dto.createdAt = news.getCreatedAt();
        dto.updatedAt = news.getUpdatedAt();
        return dto;
    }
}
