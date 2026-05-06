package com.example.rusreact2.controllers.advice;

import com.example.rusreact2.data.models.AppUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;
import reactor.core.publisher.Mono;

/**
 * Глобально добавляет auth, user, cdn в модель всех контроллеров.
 * _csrf добавляется Spring Security автоматически.
 */
@ControllerAdvice
public class SecurityAdviceController {

    @Value("${app.cdn.url:}")
    private String cdnUrl;

    @ModelAttribute(name = "auth")
    public Mono<Boolean> isAuthenticated(@AuthenticationPrincipal AppUser user) {
        return Mono.just(user != null);
    }

    @ModelAttribute(name = "user")
    public Mono<AppUser> provideUser(@AuthenticationPrincipal AppUser user) {
        return Mono.justOrEmpty(user);
    }

    @ModelAttribute(name = "cdn")
    public String cdn() {
        return cdnUrl;
    }
}
