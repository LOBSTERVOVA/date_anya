package com.example.rusreact2.controllers.web;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.reactive.result.view.Rendering;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Controller
public class SchedulePageController {

    @GetMapping("/schedule")
    public Mono<Rendering> schedule() {
        log.info("schedule page requested");
        Map<String, Object> model = new HashMap<>();
        model.put("title", "Расписание пар");
        model.put("index", "schedule-page");
        model.put("active", "schedule");
        return Mono.just(Rendering.view("template").model(model).build());
    }
}
