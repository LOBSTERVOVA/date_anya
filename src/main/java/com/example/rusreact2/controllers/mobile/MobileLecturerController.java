package com.example.rusreact2.controllers.mobile;

import com.example.rusreact2.data.dto.LecturerDto;
import com.example.rusreact2.services.LecturerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mobile/lecturer")
public class MobileLecturerController {
    private final LecturerService lecturerService;

    @GetMapping("/all")
    public Flux<LecturerDto> getAll() {
        log.info("GET /api/mobile/lecturer/all");
        return lecturerService.getAll();
    }
}
