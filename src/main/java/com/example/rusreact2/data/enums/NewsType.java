package com.example.rusreact2.data.enums;

import lombok.Getter;

@Getter
public enum NewsType {
    APP_UPDATE("Обновление приложения"),
    NEW_SECTION("Новая секция"),
    NEW_SCIENCE_CLUB("Новый научный кружок"),
    NEW_LECTURER("Новый преподаватель"),
//    TRAGIC_EVENT("Трагическое событие"),
    SPORT_ACHIEVEMENT("Спортивные достижения"),
    SPORT_EVENT("Спортивное мероприятие"),
    IMPORTANT("Важное"),
    INFORMATION("Информационная справка"),
    OTHER("Прочее");

    private final String title;

    NewsType(String title) {
        this.title = title;
    }
}
