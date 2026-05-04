package com.example.rusreact2.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
//import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
//import org.springframework.security.config.web.server.ServerHttpSecurity;
//import org.springframework.security.web.server.SecurityWebFilterChain;

//@Configuration
//@EnableWebFluxSecurity
//public class SecurityConfig {
//
//    @Bean
//    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
//        return http
//                .csrf(csrf -> csrf.disable())
//                .authorizeExchange(exchanges -> exchanges
//                        .pathMatchers("/login", "/fw/**", "/js/**", "/css/**", "/api/public/**").permitAll()
//                        .anyExchange().authenticated()
//                )
//                .formLogin(form -> form.disable())  // Отключаем Basic Auth
//                .httpBasic(basic -> basic.disable()) // Важно!
//                .build();
//    }
//}