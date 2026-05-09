package com.example.rusreact2.data.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClubScheduleDto {
    private UUID uuid;
    private UUID clubUuid;
    private int dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
}
