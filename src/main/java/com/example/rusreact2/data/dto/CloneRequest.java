package com.example.rusreact2.data.dto;

import lombok.Data;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class CloneRequest {
    private UUID departmentUuid;
    private LocalDate sourceDate;
    private LocalDate targetDate;
    private List<UUID> lecturerUuids;
    private List<DayOfWeek> daysOfWeek;
}
