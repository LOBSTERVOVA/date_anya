package com.example.rusreact2.data.models;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Table(name = "reference_info")
@Getter
@Setter
@NoArgsConstructor
public class ReferenceInfo {

    @Id
    @Column("uuid")
    private UUID uuid;

    private String theme;

    @Column(value = "importance_level")
    private Integer importanceLevel = 0;

    private String title;

    @Column(value = "html_text")
    private String htmlText;

    // Short teaser/summary displayed in lists
    @Column(value = "annotation")
    private String annotation;

    // Ranges (month-day only, without year) when this reference is especially relevant
    // Managed via MonthDayRangeRepository; not a column in reference_info
    @Transient
    private List<MonthDayRange> actualDates;

    // Прикреплённые медиафайлы (Excel, PDF, Word, фото, видео)
    // Managed via ReferenceMediaRepository + MinIO; not a column in reference_info
    @Transient
    private List<ReferenceMedia> mediaFiles;

    @Column(value = "created_at")
    private LocalDateTime createdAt;

    @Column(value = "updated_at")
    private LocalDateTime updatedAt;
}
