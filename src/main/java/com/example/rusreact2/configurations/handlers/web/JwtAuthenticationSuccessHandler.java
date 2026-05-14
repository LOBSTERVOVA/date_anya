package com.example.rusreact2.configurations.handlers.web;

import com.example.rusreact2.services.JwtService;
import com.example.rusreact2.utils.CookieUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.server.WebFilterExchange;
import org.springframework.security.web.server.authentication.ServerAuthenticationSuccessHandler;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.time.Duration;

/**
 * При успешном form-login генерирует JWT и записывает в httpOnly cookies,
 * затем редиректит на страницу, с которой пришёл пользователь (или на /schedule).
 */
@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationSuccessHandler implements ServerAuthenticationSuccessHandler {

    private final JwtService jwt;

    @Override
    public Mono<Void> onAuthenticationSuccess(WebFilterExchange webFilterExchange,
                                               Authentication authentication) {
        String username = authentication.getName();
        String digitalSignature = webFilterExchange.getExchange()
                .getRequest().getHeaders().getFirst("User-Agent");

        String accessToken = jwt.generateAccessToken(username, digitalSignature);
        String refreshToken = jwt.generateRefreshToken(username, digitalSignature);

        ResponseCookie accessCookie = ResponseCookie.from(CookieUtil.getInstance().getACCESS(), accessToken)
                .httpOnly(true)
                .maxAge(Duration.ofMillis(jwt.getAccessExpiration()))
                .path("/")
                .build();
        ResponseCookie refreshCookie = ResponseCookie.from(CookieUtil.getInstance().getREFRESH(), refreshToken)
                .httpOnly(true)
                .maxAge(Duration.ofMillis(jwt.getRefreshExpiration()))
                .path("/")
                .build();

        ServerHttpResponse response = webFilterExchange.getExchange().getResponse();
        response.addCookie(accessCookie);
        response.addCookie(refreshCookie);

        // Редирект на тот же URL (Referer) или на /schedule
        String referer = webFilterExchange.getExchange().getRequest().getHeaders().getFirst("Referer");
        String redirectUri = referer != null ? referer : "/schedule";

        response.setStatusCode(HttpStatus.FOUND);
        response.getHeaders().setLocation(URI.create(redirectUri));
        return response.setComplete();
    }
}
