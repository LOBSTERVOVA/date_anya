package com.example.rusreact2.data.models;

import com.example.rusreact2.data.enums.PracticeType;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Table(name = "practices")
public class Practice {
    @Id
    @Column("uuid")
    private UUID uuid;

    @Column("group_uuid")
    private UUID groupUuid;

    @Column("title")
    private String title;

    @Column("practice_type")
    private PracticeType practiceType;

    @Column("start_date")
    private LocalDate startDate;

    @Column("end_date")
    private LocalDate endDate;

    @Column("prohibit_pairs")
    private boolean prohibitPairs;
}
