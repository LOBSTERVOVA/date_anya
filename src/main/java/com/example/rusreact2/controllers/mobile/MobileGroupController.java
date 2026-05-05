package com.example.rusreact2.controllers.mobile;

import com.example.rusreact2.data.dto.GroupDto;
import com.example.rusreact2.services.GroupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mobile/group")
public class MobileGroupController {
    private final GroupService groupService;

    @GetMapping("/all")
    public Flux<GroupDto> getAll() {
        log.info("GET /api/mobile/group/all");
        return groupService.getAll();
    }
}
