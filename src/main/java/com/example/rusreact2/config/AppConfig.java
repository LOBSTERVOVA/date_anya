package com.example.rusreact2.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class AppConfig {

    private final String username = "master@mshart.ru";
    private final String password = "Admin_123!";

    @Bean
    public CommandLineRunner prepare() {
        return args -> {
            log.info("***************** environments start *******************");
            for (String key : System.getenv().keySet()) {
                String[] p = key.split("\\.");
                if (p.length > 1) {
                    log.info("\"{}\"=\"{}\"", key, System.getenv().get(key));
                }
            }
            log.info("****************** environments end ********************");
        };
    }

    ;
}

