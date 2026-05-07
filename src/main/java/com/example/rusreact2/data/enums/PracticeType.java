package com.example.rusreact2.data.enums;

import lombok.Getter;

@Getter
public enum PracticeType {
    EDUCATIONAL("Учебная"),
    PRODUCTION("Производственная"),
    PRE_GRADUATION("Преддипломная"),
    SCIENTIFIC_RESEARCH("Научно-исследовательская");

    private final String title;

    PracticeType(String title) {
        this.title = title;
    }
}
