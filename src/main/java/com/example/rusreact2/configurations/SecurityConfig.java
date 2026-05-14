package com.example.rusreact2.configurations;

import com.example.rusreact2.configurations.handlers.web.JwtAuthenticationConverter;
import com.example.rusreact2.configurations.handlers.web.JwtAuthenticationManager;
import com.example.rusreact2.configurations.handlers.web.JwtAuthenticationSuccessHandler;
import com.example.rusreact2.configurations.handlers.web.JwtLogoutSuccessHandler;
import com.example.rusreact2.repositories.UserRepository;
import com.example.rusreact2.services.JwtService;
import com.example.rusreact2.services.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.security.config.annotation.method.configuration.EnableReactiveMethodSecurity;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.authentication.AuthenticationWebFilter;
import org.springframework.security.web.server.csrf.CookieServerCsrfTokenRepository;
import org.springframework.security.web.server.csrf.ServerCsrfTokenRequestAttributeHandler;
import org.springframework.security.web.server.util.matcher.PathPatternParserServerWebExchangeMatcher;
import org.springframework.security.web.server.util.matcher.ServerWebExchangeMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.net.URI;

/**
 * Конфигурация безопасности.
 *
 * Две цепочки:
 *   Chain 1 ( @Order 1) — REST API /api/**
 *   Chain 2 ( @Order 2) — Web / **
 *
 * Правила доступа:
 *   - GET-запросы разрешены всем (включая незарегистрированных)
 *   - POST/PUT/DELETE — только ADMIN или MODERATOR
 *   - Аутентификация через JWT в httpOnly cookies
 *   - Form-login через POST /login (форма в хедере)
 *   - Logout через POST /logout
 */
@Slf4j
@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    // ═══════════════════════════════════════════════════════════════
    // Chain 1: REST API — /api/**
    // ═══════════════════════════════════════════════════════════════
    @Bean
    @Order(1)
    public SecurityWebFilterChain apiFilterChain(ServerHttpSecurity http) {
        AuthenticationWebFilter authFilter = new AuthenticationWebFilter(authenticationManager());
        authFilter.setServerAuthenticationConverter(authenticationConverter());

        return http
                .securityMatcher(new PathPatternParserServerWebExchangeMatcher("/api/**"))
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .addFilterAt(authFilter, SecurityWebFiltersOrder.AUTHENTICATION)
                .authorizeExchange(exchange -> exchange
                        /*
                         * ВАЖНО: тонкие проверки ролей (кто может создавать/редактировать/удалять)
                         * вынесены в контроллеры и сервисы через @AuthenticationPrincipal.
                         * Здесь — только грубый допуск: ADMIN и MODERATOR имеют доступ к /api/users/**.
                         * Конкретные ограничения (например, модератор не может создать админа) — в UserController.
                         */
                        // /api/users/** — ADMIN и MODERATOR (детальные проверки в контроллере)
                        .pathMatchers("/api/users/**").hasAnyRole("ADMIN", "MODERATOR")
                        // GET — всем (кроме /api/users/**)
                        .pathMatchers(HttpMethod.GET, "/api/**").permitAll()
                        // POST/PUT/DELETE — любому авторизованному
                        .pathMatchers(HttpMethod.POST, "/api/**").authenticated()
                        .pathMatchers(HttpMethod.PUT, "/api/**").authenticated()
                        .pathMatchers(HttpMethod.DELETE, "/api/**").authenticated()
                        .anyExchange().authenticated()
                )
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .build();

        /*
         * Пример: как разделить на mobile и обычное API.
         *
         * @Bean @Order(1)
         * public SecurityWebFilterChain mobileApiFilterChain(ServerHttpSecurity http) {
         *     // ... отдельная цепочка для /api/mobile/**
         *     // Без cookies, JWT через заголовки (Bearer + X-Refresh-Token)
         *     // Device binding через X-Device-Id
         * }
         *
         * @Bean @Order(2)
         * public SecurityWebFilterChain webApiFilterChain(ServerHttpSecurity http) {
         *     // ... для /api/**
         *     // JWT через cookies
         * }
         */
    }

    // ═══════════════════════════════════════════════════════════════
    // Chain 2: Web — /**
    // ═══════════════════════════════════════════════════════════════
    @Bean
    @Order(2)
    public SecurityWebFilterChain webFilterChain(ServerHttpSecurity http) {
        AuthenticationWebFilter authFilter = new AuthenticationWebFilter(authenticationManager());
        authFilter.setServerAuthenticationConverter(authenticationConverter());
        // Не применяем JWT-фильтр к /login и /logout — их обрабатывает formLogin/logout
        authFilter.setRequiresAuthenticationMatcher(exchange -> {
            String path = exchange.getRequest().getPath().value();
            return path.equals("/login") || path.equals("/logout")
                    ? ServerWebExchangeMatcher.MatchResult.notMatch()
                    : ServerWebExchangeMatcher.MatchResult.match();
        });

        return http
                .securityMatcher(new PathPatternParserServerWebExchangeMatcher("/**"))
                .csrf(csrf -> csrf
                        .csrfTokenRequestHandler(new ServerCsrfTokenRequestAttributeHandler())
                        .csrfTokenRepository(CookieServerCsrfTokenRepository.withHttpOnlyFalse()))
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .addFilterAt(authFilter, SecurityWebFiltersOrder.AUTHENTICATION)
                .authorizeExchange(exchange -> exchange
                        // Статика и публичные страницы — всем
                        .pathMatchers(
                                "/css/**", "/js/**", "/fw/**", "/images/**", "/favicon.ico",
                                "/", "/schedule", "/workload", "/news", "/departments-lecturers",
                                "/community/**", "/reference", "/login", "/logout"
                        ).permitAll()
                        // /users — только ADMIN и MODERATOR
                        .pathMatchers(HttpMethod.GET, "/users").hasAnyRole("ADMIN", "MODERATOR")
                        .pathMatchers(HttpMethod.GET, "/**").permitAll()
                        // /login и /logout — разрешены для всех (formLogin/logout обрабатывают их сами)
                        .pathMatchers(HttpMethod.POST, "/login").permitAll()
                        .pathMatchers(HttpMethod.POST, "/logout").permitAll()
                        // POST/PUT/DELETE на web-страницы — любому авторизованному
                        .pathMatchers(HttpMethod.POST, "/**").authenticated()
                        .pathMatchers(HttpMethod.PUT, "/**").authenticated()
                        .pathMatchers(HttpMethod.DELETE, "/**").authenticated()
                        .anyExchange().authenticated()
                )
                .formLogin(login -> login
                        .loginPage("/login")                         // форма в хедере отправляет POST на /login
                        .authenticationSuccessHandler(authenticationSuccessHandler())
                        .authenticationFailureHandler((webFilterExchange, exception) -> {
                            // При ошибке редиректим обратно на Referer с ?error
                            ServerHttpResponse response = webFilterExchange.getExchange().getResponse();
                            String referer = webFilterExchange.getExchange().getRequest().getHeaders().getFirst("Referer");
                            String redirectUri = (referer != null ? referer : "/schedule") + "?error";
                            response.setStatusCode(HttpStatus.FOUND);
                            response.getHeaders().setLocation(URI.create(redirectUri));
                            return response.setComplete();
                        })
                )
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessHandler(logoutSuccessHandler())
                )
                .build();

        /*
         * Примеры настройки доступа:
         *
         * 1. Полностью открыть всё:
         *    .authorizeExchange(exchange -> exchange.anyExchange().permitAll())
         *
         * 2. Закрыть определённые страницы:
         *    .pathMatchers("/admin/**").hasRole("ADMIN")
         *    .pathMatchers("/workload/**").hasAnyRole("ADMIN", "MODERATOR")
         *
         * 3. Закрыть для mobile API (отдельная цепочка):
         *    .securityMatcher(new PathPatternParserServerWebExchangeMatcher("/api/mobile/**"))
         *    ... JWT через заголовки, без cookies
         *
         * 4. Разрешить только GET для незарегистрированных на конкретных эндпоинтах:
         *    .pathMatchers(HttpMethod.GET, "/api/pairs/**").permitAll()
         *    .pathMatchers(HttpMethod.POST, "/api/pairs/**").hasAnyRole("ADMIN", "MODERATOR")
         */
    }

    // ═══════════════════════════════════════════════════════════════
    // Бины
    // ═══════════════════════════════════════════════════════════════

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserService userService() {
        return new UserService(userRepository, passwordEncoder());
    }

    @Bean
    public JwtAuthenticationManager authenticationManager() {
        return new JwtAuthenticationManager(jwtService, userService(), passwordEncoder());
    }

    @Bean
    public JwtAuthenticationSuccessHandler authenticationSuccessHandler() {
        return new JwtAuthenticationSuccessHandler(jwtService);
    }

    @Bean
    public JwtLogoutSuccessHandler logoutSuccessHandler() {
        return new JwtLogoutSuccessHandler();
    }

    @Bean
    public JwtAuthenticationConverter authenticationConverter() {
        return new JwtAuthenticationConverter();
    }

    /**
     * CORS — разрешаем локальную разработку.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(
                "http://localhost:8080",
                "http://localhost:3000"
        ));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
