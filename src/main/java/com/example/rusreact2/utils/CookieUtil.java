package com.example.rusreact2.utils;

import lombok.Getter;

/**
 * Синглтон с именами cookies для JWT-аутентификации.
 */
@Getter
public class CookieUtil {
    private static CookieUtil instance = null;

    private final String REFRESH;
    private final String ACCESS;
    private final String SESSION;

    protected CookieUtil() {
        String appName = "rusreact";
        REFRESH = appName + "-refresh";
        ACCESS = appName + "-access";
        SESSION = appName + "-session";
    }

    public static CookieUtil getInstance() {
        if (instance == null) {
            instance = new CookieUtil();
        }
        return instance;
    }
}
