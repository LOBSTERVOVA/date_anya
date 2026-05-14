package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.enums.Role;
import com.example.rusreact2.data.models.AppUser;
import com.example.rusreact2.services.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.UUID;

/**
 * Управление пользователями.
 *
 * Права:
 * - ADMIN: полный доступ ко всем пользователям
 * - MODERATOR: list, get, create (не ADMIN/MODERATOR), update (себя + не ADMIN/MODERATOR),
 *              changePassword и toggleActive (только не ADMIN/MODERATOR)
 *
 * Тонкие проверки ролей — здесь через @AuthenticationPrincipal,
 * а не в SecurityConfig (там только грубый допуск).
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    // ═══════════════════════════════════════════════════════════════
    // Проверки ролей
    // ═══════════════════════════════════════════════════════════════

    /** Доступен только ADMIN и MODERATOR. */
    private Mono<AppUser> requireAdminOrModerator(AppUser user) {
        if (user == null || (user.getRole() != Role.ADMIN && user.getRole() != Role.MODERATOR)) {
            return Mono.error(new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Недостаточно прав"));
        }
        return Mono.just(user);
    }

    /**
     * Проверка, что модератор не пытается создать пользователя с ролью ADMIN или MODERATOR.
     * Администратор может создавать любые роли.
     */
    private Mono<AppUser> requireRoleNotAdminOrModeratorForModerator(AppUser currentUser, AppUser newUser) {
        if (currentUser.getRole() == Role.MODERATOR &&
            (newUser.getRole() == Role.ADMIN || newUser.getRole() == Role.MODERATOR)) {
            return Mono.error(new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Модератор не может создавать администраторов и модераторов"));
        }
        return Mono.just(newUser);
    }

    /**
     * Для update: модератор может редактировать себя и пользователей с ролью
     * STUDENT/LECTURER/DEPARTMENT_ADMIN, но не ADMIN и не других MODERATOR.
     */
    private Mono<AppUser> requireCanEditForModerator(AppUser currentUser, AppUser target) {
        if (currentUser.getRole() == Role.MODERATOR) {
            // Себя редактировать можно
            if (currentUser.getUuid().equals(target.getUuid())) {
                return Mono.just(target);
            }
            // Чужих ADMIN и MODERATOR — нельзя
            if (target.getRole() == Role.ADMIN || target.getRole() == Role.MODERATOR) {
                return Mono.error(new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Модератор не может редактировать администраторов и других модераторов"));
            }
        }
        return Mono.just(target);
    }

    /**
     * Для toggleActive/changePassword: модератор не может затрагивать ADMIN и MODERATOR.
     * Админ не может отключить сам себя (проверка в сервисе).
     */
    private Mono<AppUser> requireTargetNotAdminOrModeratorForModerator(AppUser currentUser, AppUser target) {
        if (currentUser.getRole() == Role.MODERATOR &&
            (target.getRole() == Role.ADMIN || target.getRole() == Role.MODERATOR)) {
            return Mono.error(new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Модератор не может изменять администраторов и других модераторов"));
        }
        return Mono.just(target);
    }

    // ═══════════════════════════════════════════════════════════════
    // Эндпоинты
    // ═══════════════════════════════════════════════════════════════

    /**
     * Пагинированный список пользователей. ADMIN и MODERATOR.
     */
    @GetMapping
    public Mono<Map<String, Object>> list(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "15") int size,
            @RequestParam(value = "search", defaultValue = "") String search,
            @RequestParam(value = "role", defaultValue = "") String role,
            @AuthenticationPrincipal AppUser currentUser
    ) {
        log.info("list users: page={}, size={}, search={}, role={}", page, size, search, role);
        return requireAdminOrModerator(currentUser)
                .then(userService.getUsersPaged(page, size, search, role));
    }

    /**
     * Получить пользователя по uuid. ADMIN и MODERATOR.
     */
    @GetMapping("/{uuid}")
    public Mono<AppUser> get(@PathVariable UUID uuid,
                              @AuthenticationPrincipal AppUser currentUser) {
        log.info("get user: uuid={}", uuid);
        return requireAdminOrModerator(currentUser)
                .then(userService.findById(uuid));
    }

    /**
     * Создать пользователя. ADMIN и MODERATOR.
     * Модератор не может создавать ADMIN и MODERATOR.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<AppUser> create(@RequestBody AppUser user,
                                 @AuthenticationPrincipal AppUser currentUser) {
        log.info("create user: username={}, role={}", user.getUsername(), user.getRole());
        return requireAdminOrModerator(currentUser)
                .then(requireRoleNotAdminOrModeratorForModerator(currentUser, user))
                .then(userService.createUser(user));
    }

    /**
     * Обновить данные пользователя. ADMIN и MODERATOR.
     * Модератор может редактировать себя и пользователей с ролью ниже MODERATOR.
     */
    @PutMapping("/{uuid}")
    public Mono<AppUser> update(@PathVariable UUID uuid,
                                 @RequestBody AppUser user,
                                 @AuthenticationPrincipal AppUser currentUser) {
        log.info("update user: uuid={}, username={}", uuid, user.getUsername());
        return requireAdminOrModerator(currentUser)
                .then(userService.findById(uuid))
                .flatMap(target -> requireCanEditForModerator(currentUser, target))
                .then(userService.updateUser(uuid, user));
    }

    /**
     * Сменить пароль пользователя. ADMIN и MODERATOR.
     * Модератор не может менять пароль ADMIN и MODERATOR.
     * Тело запроса: { "password": "новый_пароль" }
     */
    @PutMapping("/{uuid}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> changePassword(@PathVariable UUID uuid,
                                      @RequestBody Map<String, String> body,
                                      @AuthenticationPrincipal AppUser currentUser) {
        String newPassword = body.get("password");
        log.info("change password for user: uuid={}", uuid);
        return requireAdminOrModerator(currentUser)
                .then(userService.findById(uuid))
                .flatMap(target -> requireTargetNotAdminOrModeratorForModerator(currentUser, target))
                .then(userService.changePassword(uuid, newPassword));
    }

    /**
     * Самостоятельная смена пароля текущим пользователем.
     * Доступно всем авторизованным.
     * Тело запроса: { "oldPassword": "...", "newPassword": "..." }
     */
    @PutMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> changeOwnPassword(@RequestBody Map<String, String> body,
                                         @AuthenticationPrincipal AppUser currentUser) {
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");
        if (oldPassword == null || newPassword == null) {
            return Mono.error(new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "oldPassword и newPassword обязательны"));
        }
        log.info("self-service password change for user: {}", currentUser.getUsername());
        return userService.changeOwnPassword(currentUser, oldPassword, newPassword);
    }

    /**
     * Переключить активность пользователя (включить/отключить).
     * ADMIN и MODERATOR.
     * Админ не может отключить сам себя.
     * Модератор не может отключать ADMIN и MODERATOR.
     */
    @PutMapping("/{uuid}/toggle-active")
    public Mono<AppUser> toggleActive(@PathVariable UUID uuid,
                                       @AuthenticationPrincipal AppUser currentUser) {
        log.info("toggle active for user: uuid={}, by user: {}",
                 uuid, currentUser != null ? currentUser.getUsername() : "unknown");
        return requireAdminOrModerator(currentUser)
                .then(userService.findById(uuid))
                .flatMap(target -> requireTargetNotAdminOrModeratorForModerator(currentUser, target))
                .then(userService.toggleActive(uuid,
                        currentUser != null ? currentUser.getUuid() : null));
    }
}
