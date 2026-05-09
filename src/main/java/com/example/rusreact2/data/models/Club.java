package com.example.rusreact2.data.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.util.*;

@Data
@Table("clubs")
public class Club {
    @Id
    private UUID uuid;
    private String name;
    /** SPORTS_CLUB или SCIENCE_CLUB */
    private String type;
    /** URL аватарки в MinIO */
    private String avatar;
    private String description;

    @Column("room_uuids")
    private Set<UUID> roomUuids;

    @Column("department_uuid")
    private UUID departmentUuid;

    @Transient
    private List<ClubSchedule> schedules;
}
