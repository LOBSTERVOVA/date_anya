package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.DepartmentDto;
import com.example.rusreact2.data.models.Department;
import com.example.rusreact2.services.DepartmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/department")
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    public Flux<DepartmentDto> list(@RequestParam(value = "q", required = false) String q) {
        return departmentService.search(q);
    }

    @GetMapping("/{uuid}")
    public Mono<DepartmentDto> get(@PathVariable UUID uuid) {
        return departmentService.findById(uuid);
    }

    @PostMapping
    public Mono<DepartmentDto> create(@RequestBody Department department) {
        return departmentService.save(department);
    }

    @PutMapping("/{uuid}")
    public Mono<DepartmentDto> update(@PathVariable UUID uuid, @RequestBody Department department) {
        department.setUuid(uuid);
        return departmentService.update(department);
    }

}
