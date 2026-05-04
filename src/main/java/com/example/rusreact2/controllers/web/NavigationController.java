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

    @GetMapping("/departments-lecturers")
    public Mono<Rendering> departmentsLecturers() {
        Map<String, Object> model = new HashMap<>();
        model.put("title", "Кафедры и преподаватели");
        model.put("index", "departments-lecturers");
        model.put("active", "departments-lecturers");
        return Mono.just(Rendering.view("template").model(model).build());
    }

    @GetMapping("/departments/{uuid}/edit")
    public Mono<Rendering> departmentEdit(@PathVariable("uuid") String uuid) {
        Map<String, Object> model = new HashMap<>();
        model.put("title", "Редактирование кафедры");
        model.put("index", "departments-edit");
        model.put("active", "departments-lecturers");
        model.put("departmentUuid", uuid);
        return Mono.just(Rendering.view("template").model(model).build());
    }

    @GetMapping("/departments/new")
    public Mono<Rendering> departmentNew() {
        Map<String, Object> model = new HashMap<>();
        model.put("title", "Новая кафедра");
        model.put("index", "departments-new");
        model.put("active", "departments-lecturers");
        return Mono.just(Rendering.view("template").model(model).build());
    }

    @GetMapping("/workload")
    public Mono<Rendering> workload() {
        Map<String, Object> model = new HashMap<>();
        model.put("title", "Нагрузка-часы преподавателей");
        model.put("index", "workload");
        model.put("active", "workload");
        return Mono.just(Rendering.view("template").model(model).build());
    }

    @GetMapping("/community/sports-sections")
    public Mono<Rendering> communitySportsSections() {
        Map<String, Object> model = new HashMap<>();
        model.put("title", "Спортивные секции");
        model.put("index", "community-sports-sections");
        model.put("active", "community");
        return Mono.just(Rendering.view("template").model(model).build());
    }

    @GetMapping("/community/science-clubs")
    public Mono<Rendering> communityScienceClubs() {
        Map<String, Object> model = new HashMap<>();
        model.put("title", "Научные кружки");
        model.put("index", "community-science-clubs");
        model.put("active", "community");
        return Mono.just(Rendering.view("template").model(model).build());
    }

    @GetMapping("/community/sport-events")
    public Mono<Rendering> communitySportEvents() {
        Map<String, Object> model = new HashMap<>();
        model.put("title", "Спортивные мероприятия");
        model.put("index", "community-sport-events");
        model.put("active", "community");
        return Mono.just(Rendering.view("template").model(model).build());
    }

    @GetMapping("/community/canteen-menu")
    public Mono<Rendering> communityCanteenMenu() {
        Map<String, Object> model = new HashMap<>();
        model.put("title", "Меню столовой");
        model.put("index", "community-canteen-menu");
        model.put("active", "community");
        return Mono.just(Rendering.view("template").model(model).build());
    }

    @GetMapping("/reference")
    public Mono<Rendering> reference() {
        Map<String, Object> model = new HashMap<>();
        model.put("title", "Справочная информация");
        model.put("index", "reference");
        model.put("active", "reference");
        return Mono.just(Rendering.view("template").model(model).build());
    }

    @GetMapping("/news")
    public Mono<Rendering> news() {
        Map<String, Object> model = new HashMap<>();
        model.put("title", "Новости");
        model.put("index", "news");
        model.put("active", "news");
        return Mono.just(Rendering.view("template").model(model).build());
    }

}
