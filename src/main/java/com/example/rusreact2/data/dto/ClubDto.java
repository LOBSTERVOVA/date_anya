package com.example.rusreact2.data.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClubDto {
    private UUID uuid;
    private String name;
    private String type;
    private String avatar;
    private String description;
    private Set<UUID> roomUuids;
    private Set<RoomDto> rooms;
    private UUID departmentUuid;
    private String departmentName;
    private List<ClubScheduleDto> schedules;
}
