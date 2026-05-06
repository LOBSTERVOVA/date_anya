package com.example.rusreact2.configurations.handlers.web;

import com.example.rusreact2.utils.CookieUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseCookie;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.server.WebFilterExchange;
import org.springframework.security.web.server.authentication.logout.RedirectServerLogoutSuccessHandler;
import reactor.core.publisher.Mono;

import java.net.URI;

/**
 * При выходе очищает аутентификационные cookies и редиректит на /schedule.
 */
@Slf4j
public class JwtLogoutSuccessHandler extends RedirectServerLogoutSuccessHandler {

    public JwtLogoutSuccessHandler() {
        super();
        setLogoutSuccessUrl(URI.create("/schedule"));
    }

    @Override
    public Mono<Void> onLogoutSuccess(WebFilterExchange webFilterExchange,
                                       Authentication authentication) {
        ServerHttpResponse response = webFilterExchange.getExchange().getResponse();

        response.addCookie(ResponseCookie.from(CookieUtil.getInstance().getACCESS(), "")
                .httpOnly(true).path("/").maxAge(0).build());
        response.addCookie(ResponseCookie.from(CookieUtil.getInstance().getREFRESH(), "")
                .httpOnly(true).path("/").maxAge(0).build());

        return super.onLogoutSuccess(webFilterExchange, authentication);
    }
}
