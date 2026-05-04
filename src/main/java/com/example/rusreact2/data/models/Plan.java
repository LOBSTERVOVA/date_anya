package com.example.rusreact2.data.models;

import com.example.rusreact2.data.enums.LessonType;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Table(name = "plans")
@NoArgsConstructor(force = true)
public class Plan {
    @Id
    @Column("uuid")
    UUID uuid;

    UUID groupUuid;

    UUID subjectUuid;
    int term;
    LessonType lessonType;
    int hours;
    LocalDateTime createdAt;
}
