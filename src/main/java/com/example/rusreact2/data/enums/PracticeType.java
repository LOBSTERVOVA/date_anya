package com.example.rusreact2.data.enums;

import lombok.Getter;

@Getter
public enum PracticeType {
    SCIENTIFIC_RESEARCH("Научно-исследовательская"),
    PRODUCTION("Производственная");

    private final String title;

    PracticeType(String title) {
        this.title = title;
    }
}
