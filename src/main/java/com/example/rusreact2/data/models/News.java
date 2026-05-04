package com.example.rusreact2.data.models;

import com.example.rusreact2.data.enums.NewsType;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Data
@Table(name = "news")
@NoArgsConstructor(force = true)
public class News {
    @Id
    @Column("uuid")
    UUID uuid;

    String title;

    @Column(value = "html_content")
    String htmlContent;

    NewsType type;

    @Column(value = "created_at")
    LocalDateTime createdAt;

    @Column(value = "updated_at")
    LocalDateTime updatedAt;

    @Override
    public int hashCode() {
        return Objects.hash(uuid);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        News that = (News) o;
        return Objects.equals(uuid, that.uuid);
    }
}
