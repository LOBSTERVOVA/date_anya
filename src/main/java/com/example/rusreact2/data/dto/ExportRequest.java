package com.example.rusreact2.data.dto;

import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class ExportRequest {
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate from;
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate to;
    private List<UUID> groups;
    /// Если передан — режим «для преподавателей»: экспорт для кафедры
    private UUID departmentUuid;
}
