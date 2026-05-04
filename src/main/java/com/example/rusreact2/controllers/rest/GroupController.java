package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.GroupDto;
import com.example.rusreact2.services.GroupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/group")
public class GroupController {
    private final GroupService groupService;

    @GetMapping
    public Flux<GroupDto> list(@RequestParam(value = "q", required = false) String q) {
        return groupService.search(q);
    }
}
