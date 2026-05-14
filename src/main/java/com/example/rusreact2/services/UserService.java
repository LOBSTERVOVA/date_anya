package com.example.rusreact2.services;

import com.example.rusreact2.data.models.AppUser;
import com.example.rusreact2.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RequiredArgsConstructor
public class UserService implements ReactiveUserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public Mono<UserDetails> findByUsername(String username) {
        return userRepository.findByUsername(username)
                .cast(UserDetails.class);
    }

    public Mono<AppUser> createUser(AppUser user) {
        user.setActive(true); // новые пользователи всегда включены
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    /**
     * Пагинированный список пользователей с поиском по ФИО и фильтрацией по роли.
     */
    public Mono<Map<String, Object>> getUsersPaged(int page, int size, String search, String role) {
        int offset = page * size;
        String searchText = (search != null) ? search.trim() : "";
        String roleFilter = (role != null) ? role.trim().toUpperCase() : "";

        Flux<AppUser> itemsFlux = userRepository.findAllPaged(size, offset, searchText, roleFilter);
        Mono<Long> totalMono = userRepository.countFiltered(searchText, roleFilter);

        return Mono.zip(itemsFlux.collectList(), totalMono)
                .map(tuple -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("items", tuple.getT1());
                    result.put("total", tuple.getT2());
                    result.put("page", page);
                    result.put("size", size);
                    return result;
                });
    }

    /**
     * Получить пользователя по uuid.
     */
    public Mono<AppUser> findById(UUID uuid) {
        return userRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Пользователь с uuid " + uuid + " не найден")));
    }

    /**
     * Обновить данные пользователя (кроме пароля).
     */
    public Mono<AppUser> updateUser(UUID uuid, AppUser updated) {
        return userRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Пользователь с uuid " + uuid + " не найден")))
                .flatMap(existing -> {
                    existing.setFirstName(updated.getFirstName());
                    existing.setLastName(updated.getLastName());
                    existing.setPatronymic(updated.getPatronymic());
                    existing.setBirth(updated.getBirth());
                    existing.setRole(updated.getRole());
                    existing.setDepartmentUuid(updated.getDepartmentUuid());
                    return userRepository.save(existing);
                });
    }

    /**
     * Сменить пароль пользователя.
     */
    public Mono<Void> changePassword(UUID uuid, String newPassword) {
        return userRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Пользователь с uuid " + uuid + " не найден")))
                .flatMap(user -> {
                    user.setPassword(passwordEncoder.encode(newPassword));
                    return userRepository.save(user);
                })
                .then();
    }

    /**
     * Самостоятельная смена пароля текущим пользователем.
     * Проверяет старый пароль, затем сохраняет новый.
     */
    public Mono<Void> changeOwnPassword(AppUser currentUser, String oldPassword, String newPassword) {
        if (!passwordEncoder.matches(oldPassword, currentUser.getPassword())) {
            return Mono.error(new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Неверный старый пароль"));
        }
        currentUser.setPassword(passwordEncoder.encode(newPassword));
        return userRepository.save(currentUser).then();
    }

    /**
     * Переключить активность пользователя (включить/отключить).
     * Админ не может отключить сам себя.
     */
    public Mono<AppUser> toggleActive(UUID uuid, UUID currentUserUuid) {
        if (uuid.equals(currentUserUuid)) {
            return Mono.error(new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Нельзя отключить самого себя"));
        }
        return userRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Пользователь с uuid " + uuid + " не найден")))
                .flatMap(user -> {
                    user.setActive(!user.isActive());
                    return userRepository.save(user);
                });
    }
}
