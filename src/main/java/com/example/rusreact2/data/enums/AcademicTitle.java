package com.example.rusreact2.data.enums;

import lombok.Getter;

@Getter
public enum AcademicTitle {
    HEAD ("Заведующий кафедрой"),
    DOCENT ("Доцент"),
    PROFESSOR("Профессор"),
    SENIOR_LECTURER("Старший преподаватель"),
    LECTURER("Преподаватель"),
    EDUCATIONAL_METHODOLOGIST("Специалист по учебно-методической работе");

    private final String title;

    AcademicTitle(String title) {
        this.title = title;
    }
}
