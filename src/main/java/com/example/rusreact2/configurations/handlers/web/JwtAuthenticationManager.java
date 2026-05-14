package com.example.rusreact2.configurations.handlers.web;

import com.example.rusreact2.services.JwtService;
import com.example.rusreact2.services.UserService;
import com.example.rusreact2.utils.CookieUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseCookie;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Менеджер аутентификации для web (cookies).
 *
 * Логика:
 *   1. Access token валиден → проверка digital_signature (User-Agent) → загружаем пользователя
 *   2. Access token невалиден, но refresh валиден → генерируем новые токены в cookies
 *   3. Оба невалидны → fallback на basic auth (логин/пароль)
 */
@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationManager implements ReactiveAuthenticationManager {

    private final JwtService jwt;
    private final UserService userService;
    private final PasswordEncoder encoder;

    @Override
    public Mono<Authentication> authenticate(Authentication authentication) {
        String accessToken = authentication.getPrincipal().toString();
        String refreshToken = authentication.getCredentials().toString();

        // Ветка 1: access token валиден
        if (!accessToken.isEmpty() && jwt.validateToken(accessToken)) {
            return Mono.deferContextual(ctx -> {
                ServerWebExchange exchange = ctx.get(ServerWebExchange.class);
                String userAgent = exchange.getRequest().getHeaders().getFirst("User-Agent");

                if (userAgent != null && userAgent.equals(jwt.getDigitalSignatureFromToken(accessToken))) {
                    return userService.findByUsername(jwt.getUsernameFromToken(accessToken))
                            .flatMap(user -> {
                                if (!user.isEnabled()) {
                                    clearAuthCookies(exchange);
                                    return Mono.error(new BadCredentialsException("Пользователь неактивен"));
                                }
                                return Mono.just(new UsernamePasswordAuthenticationToken(
                                        user, null, user.getAuthorities()));
                            })
                            .switchIfEmpty(Mono.defer(() -> {
                                clearAuthCookies(exchange);
                                return Mono.error(new BadCredentialsException("User not found"));
                            }));
                }
                clearAuthCookies(exchange);
                return Mono.error(new BadCredentialsException("Digital signature mismatch"));
            });
        }

        // Ветка 2: refresh token валиден
        if (!refreshToken.isEmpty() && jwt.validateToken(refreshToken)) {
            return Mono.deferContextual(ctx -> {
                ServerWebExchange exchange = ctx.get(ServerWebExchange.class);
                String userAgent = exchange.getRequest().getHeaders().getFirst("User-Agent");

                if (userAgent != null && userAgent.equals(jwt.getDigitalSignatureFromToken(refreshToken))) {
                    return userService.findByUsername(jwt.getUsernameFromToken(refreshToken))
                            .flatMap(user -> {
                                if (!user.isEnabled()) {
                                    clearAuthCookies(exchange);
                                    return Mono.error(new BadCredentialsException("Пользователь неактивен"));
                                }
                                String username = user.getUsername();
                                String newAccess = jwt.generateAccessToken(username, userAgent);
                                String newRefresh = jwt.generateRefreshToken(username, userAgent);
                                exchange.getResponse().addCookie(createAccessCookie(newAccess));
                                exchange.getResponse().addCookie(createRefreshCookie(newRefresh));

                                return Mono.just(new UsernamePasswordAuthenticationToken(
                                        user, null, user.getAuthorities()));
                            })
                            .switchIfEmpty(Mono.defer(() -> {
                                clearAuthCookies(exchange);
                                return Mono.error(new BadCredentialsException("User not found"));
                            }));
                }
                clearAuthCookies(exchange);
                return Mono.error(new BadCredentialsException("Digital signature mismatch"));
            });
        }

        // Ветка 3: fallback — basic auth (используется при form login)
        return baseAuth(authentication);
    }

    private Mono<Authentication> baseAuth(Authentication authentication) {
        String username = authentication.getPrincipal().toString();
        String password = authentication.getCredentials().toString();

        if (username.isEmpty() || password.isEmpty()) {
            return Mono.error(new BadCredentialsException("Empty credentials"));
        }

        return userService.findByUsername(username)
                .flatMap(user -> {
                    if (encoder.matches(password, user.getPassword())) {
                        if (!user.isEnabled()) {
                            return Mono.error(new BadCredentialsException("Пользователь неактивен"));
                        }
                        return Mono.just(new UsernamePasswordAuthenticationToken(
                                user, null, user.getAuthorities()));
                    }
                    return Mono.error(new BadCredentialsException("Invalid credentials"));
                })
                .cast(Authentication.class)
                .switchIfEmpty(Mono.error(new BadCredentialsException("User not found")));
    }

    private void clearAuthCookies(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.addCookie(createEmptyCookie(CookieUtil.getInstance().getACCESS()));
        response.addCookie(createEmptyCookie(CookieUtil.getInstance().getREFRESH()));
    }

    private ResponseCookie createEmptyCookie(String name) {
        return ResponseCookie.from(name, "")
                .httpOnly(true).path("/").maxAge(0).build();
    }

    private ResponseCookie createAccessCookie(String value) {
        return ResponseCookie.from(CookieUtil.getInstance().getACCESS(), value)
                .httpOnly(true)
                .maxAge(Duration.ofMillis(jwt.getAccessExpiration()))
                .path("/")
                .build();
    }

    private ResponseCookie createRefreshCookie(String value) {
        return ResponseCookie.from(CookieUtil.getInstance().getREFRESH(), value)
                .httpOnly(true)
                .maxAge(Duration.ofMillis(jwt.getRefreshExpiration()))
                .path("/")
                .build();
    }
}
