package com.example.rusreact2.controllers.mobile;

import com.example.rusreact2.data.dto.DepartmentDto;
import com.example.rusreact2.services.DepartmentService;
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
@RequestMapping("/api/mobile/department")
public class MobileDepartmentController {
    private final DepartmentService departmentService;

    @GetMapping
    public Flux<DepartmentDto> search(@RequestParam(value = "q", required = false) String q) {
        log.info("GET /api/mobile/department?q={}", q);
        return departmentService.search(q);
    }
}
