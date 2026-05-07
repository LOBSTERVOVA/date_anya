package com.example.rusreact2.data.dto;

import com.example.rusreact2.data.enums.PracticeType;
import com.example.rusreact2.data.models.Practice;
import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class PracticeDto {
    private UUID uuid;
    private UUID groupUuid;
    private String title;
    private PracticeType practiceType;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean prohibitPairs;

    public static PracticeDto from(Practice p) {
        PracticeDto dto = new PracticeDto();
        dto.setUuid(p.getUuid());
        dto.setGroupUuid(p.getGroupUuid());
        dto.setTitle(p.getTitle());
        dto.setPracticeType(p.getPracticeType());
        dto.setStartDate(p.getStartDate());
        dto.setEndDate(p.getEndDate());
        dto.setProhibitPairs(p.isProhibitPairs());
        return dto;
    }

    public String getPracticeTypeTitle() {
        return practiceType != null ? practiceType.getTitle() : null;
    }
}
