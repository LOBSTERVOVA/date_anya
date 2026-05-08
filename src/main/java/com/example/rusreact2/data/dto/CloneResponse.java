package com.example.rusreact2.data.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CloneResponse {
    private int successCount;
    private List<CloneError> errors = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CloneError {
        private DayOfWeek dayOfWeek;
        private int pairOrder;
        private String lecturerName;
        private String reason;
    }
}
