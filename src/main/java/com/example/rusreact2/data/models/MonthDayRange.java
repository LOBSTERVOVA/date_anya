package com.example.rusreact2.data.models;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.time.LocalDateTime;
import java.util.UUID;

@Table(name = "month_day_ranges")
@Getter
@Setter
@NoArgsConstructor
public class MonthDayRange {

    @Id
    @Column("uuid")
    private UUID uuid;

    @Column("start_month")
    private Integer startMonth;

    @Column("start_day")
    private Integer startDay;

    @Column("end_month")
    private Integer endMonth;

    @Column("end_day")
    private Integer endDay;

    @Column("reference_uuid")
    private UUID referenceUuid;

    @Column("created_at")
    private LocalDateTime createdAt;
}
