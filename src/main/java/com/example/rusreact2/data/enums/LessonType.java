package com.example.rusreact2.data.enums;

import lombok.Getter;

@Getter
public enum LessonType {
    LECTURE ("Лекции"),
    PRACTICE("Практические занятия"),
    CREDIT("Зачет"),
    DIFFERENTIATED_CREDIT("Дифференцированный зачет"),
    EXAM("Экзамен");

    LessonType(String title) {}
}
