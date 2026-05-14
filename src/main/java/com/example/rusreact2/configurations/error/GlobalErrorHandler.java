package com.example.rusreact2.configurations.error;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Глобальный обработчик ошибок для REST-контроллеров.
 * Преобразует исключения в JSON с human-readable сообщением.
 */
@Slf4j
@RestControllerAdvice
public class GlobalErrorHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public Mono<ResponseEntity<Map<String, Object>>> handleResponseStatusException(ResponseStatusException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", ex.getStatusCode().value());
        body.put("error", ex.getReason() != null ? ex.getReason() : "Ошибка");
        body.put("message", ex.getReason() != null ? ex.getReason() : "");
        log.warn("HTTP {}: {}", ex.getStatusCode().value(), ex.getReason());
        return Mono.just(ResponseEntity.status(ex.getStatusCode()).body(body));
    }

//    @ExceptionHandler(Exception.class)
//    public Mono<ResponseEntity<Map<String, Object>>> handleGeneral(Exception ex) {
//        log.error("Необработанное исключение", ex);
//        Map<String, Object> body = new LinkedHashMap<>();
//        body.put("timestamp", Instant.now().toString());
//        body.put("status", 500);
//        body.put("error", "Внутренняя ошибка сервера");
//        body.put("message", ex.getMessage() != null ? ex.getMessage() : "");
//        return Mono.just(ResponseEntity.status(500).body(body));
//    }
}
