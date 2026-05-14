package com.example.rusreact2.controllers.web;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.reactive.result.view.Rendering;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Controller
@RequestMapping
public class NavigationController {

    @GetMapping("/")
    public Mono<String> rootRedirect() {
        log.info("rootRedirect");
        return Mono.just("redirect:/schedule");
    }

    @GetMapping("/login")
    public Mono<String> loginPage() {
        return Mono.just("redirect:/schedule");
    }

    @GetMapping("/departments-lecturers")
    public Mono<Rendering> departmentsLecturers() {
        return buildModel("Кафедры и преподаватели", "departments-lecturers", "departments-lecturers");
    }

    @GetMapping("/departments/{uuid}/edit")
    public Mono<Rendering> departmentEdit(@PathVariable("uuid") String uuid) {
        return buildModelMap("Редактирование кафедры", "departments-edit", "departments-lecturers")
                .map(model -> {
                    model.put("departmentUuid", uuid);
                    return Rendering.view("template").model(model).build();
                });
    }

    @GetMapping("/departments/new")
    public Mono<Rendering> departmentNew() {
        return buildModel("Новая кафедра", "departments-new", "departments-lecturers");
    }

    @GetMapping("/workload")
    public Mono<Rendering> workload() {
        return buildModel("Нагрузка-часы преподавателей", "workload", "workload");
    }

    @GetMapping("/community/sports-sections")
    public Mono<Rendering> communitySportsSections() {
        return buildModel("Спортивные секции", "community-sports-sections", "community");
    }

    @GetMapping("/community/science-clubs")
    public Mono<Rendering> communityScienceClubs() {
        return buildModel("Научные кружки", "community-science-clubs", "community");
    }

    @GetMapping("/community/sport-events")
    public Mono<Rendering> communitySportEvents() {
        return buildModel("Спортивные мероприятия", "community-sport-events", "community");
    }

    @GetMapping("/community/canteen-menu")
    public Mono<Rendering> communityCanteenMenu() {
        return buildModel("Меню столовой", "community-canteen-menu", "community");
    }

    @GetMapping("/reference")
    public Mono<Rendering> reference() {
        return buildModel("Справочная информация", "reference", "reference");
    }

    @GetMapping("/news")
    public Mono<Rendering> news() {
        return buildModel("Новости", "news", "news");
    }

    private Mono<Rendering> buildModel(String title, String index, String active) {
        return buildModelMap(title, index, active)
                .map(model -> Rendering.view("template").model(model).build());
    }

    private Mono<Map<String, Object>> buildModelMap(String title, String index, String active) {
        Map<String, Object> model = new HashMap<>();
        model.put("title", title);
        model.put("index", index);
        model.put("active", active);
        return Mono.just(model);
    }
}
