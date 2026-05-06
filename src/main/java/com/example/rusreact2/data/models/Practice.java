package com.example.rusreact2.data.models;

import com.example.rusreact2.data.enums.PracticeType;
import lombok.Data;
import org.springframework.data.annotation.Id;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class Practice {
    @Id
    private UUID uuid;
    private UUID groupUuid;
    private String title;
    private PracticeType practiceType;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean prohibitPairs;
}
