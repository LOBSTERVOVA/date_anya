package com.example.rusreact2.data.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Table("club_schedules")
public class ClubSchedule {
    @Id
    private UUID uuid;

    @Column("club_uuid")
    private UUID clubUuid;

    /** 1=MONDAY ... 7=SUNDAY */
    @Column("day_of_week")
    private int dayOfWeek;

    @Column("start_time")
    private LocalTime startTime;

    @Column("end_time")
    private LocalTime endTime;
}
