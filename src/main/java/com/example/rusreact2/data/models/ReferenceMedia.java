package com.example.rusreact2.data.models;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.time.LocalDateTime;
import java.util.UUID;

@Table(name = "reference_media")
@Getter
@Setter
@NoArgsConstructor
public class ReferenceMedia {

    @Id
    @Column("uuid")
    private UUID uuid;

    @Column("reference_uuid")
    private UUID referenceUuid;

    /// Оригинальное имя файла, которое видел пользователь
    @Column("file_name")
    private String fileName;

    /// Путь к объекту в MinIO (включая бакет)
    @Column("storage_path")
    private String storagePath;

    /// MIME-тип (image/png, application/pdf, video/mp4 и т.д.)
    @Column("content_type")
    private String contentType;

    /// Размер файла в байтах
    @Column("file_size")
    private Long fileSize;

    @Column("created_at")
    private LocalDateTime createdAt;
}
