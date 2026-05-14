package com.example.rusreact2.configurations;

import com.example.rusreact2.data.enums.Role;
import com.example.rusreact2.data.models.AppUser;
import com.example.rusreact2.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/**
 * Создаёт дефолтного администратора при первом запуске, если его ещё нет.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    public void init() {
        userRepository.findByUsername("admin@rus.ru")
                .switchIfEmpty(createDefaultAdmin())
                .subscribe(
                        user -> log.info("Admin user already exists: {}", user.getUsername()),
                        error -> log.error("Error initializing admin: {}", error.getMessage())
                );
    }

    private Mono<AppUser> createDefaultAdmin() {
        AppUser admin = new AppUser();
        admin.setUsername("admin@rus.ru");
        admin.setPassword(passwordEncoder.encode("Admin_123!"));
        admin.setFirstName("Владимир");
        admin.setLastName("Балашев");
        admin.setPatronymic("Кириллович");
        admin.setRole(Role.ADMIN);
        admin.setActive(true);
        log.info("Creating default admin user: admin@rus.ru / Admin_123!");
        return userRepository.save(admin);
    }
}
