package com.example.rusreact2.configurations.handlers.web;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpCookie;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.server.authentication.ServerAuthenticationConverter;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import com.example.rusreact2.utils.CookieUtil;

/**
 * Извлекает access/refresh токены из httpOnly cookies.
 */
@Slf4j
public class JwtAuthenticationConverter implements ServerAuthenticationConverter {

    @Override
    public Mono<Authentication> convert(ServerWebExchange exchange) {
        String accessToken = extractTokenFromCookie(
                exchange.getRequest(), CookieUtil.getInstance().getACCESS());
        String refreshToken = extractTokenFromCookie(
                exchange.getRequest(), CookieUtil.getInstance().getREFRESH());

        if (accessToken.isEmpty() && refreshToken.isEmpty()) {
            return Mono.empty();
        }

        return Mono.just(new UsernamePasswordAuthenticationToken(accessToken, refreshToken));
    }

    private String extractTokenFromCookie(ServerHttpRequest request, String cookieName) {
        HttpCookie cookie = request.getCookies().getFirst(cookieName);
        return cookie != null ? cookie.getValue() : "";
    }
}
