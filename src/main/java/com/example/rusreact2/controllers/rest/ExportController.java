package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.ExportRequest;
import com.example.rusreact2.services.ExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.format.DateTimeFormatter;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/export")
public class ExportController {

    private final ExportService exportService;

    @PostMapping(value = "/schedule", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ResponseEntity<byte[]>> exportSchedule(@RequestBody ExportRequest request) {
        // Режим: если передан departmentUuid — экспорт для преподавателей, иначе — для студентов
        Mono<byte[]> dataMono = request.getDepartmentUuid() != null
                ? exportService.exportScheduleForLecturers(request)
                : exportService.exportSchedule(request);

        return dataMono
                .map(data -> {
                    if (data.length == 0) {
                        return new ResponseEntity<>(new byte[0], HttpStatus.BAD_REQUEST);
                    }

                    String fromStr = request.getFrom() != null
                            ? request.getFrom().format(DateTimeFormatter.ISO_DATE)
                            : "from";
                    String toStr = request.getTo() != null
                            ? request.getTo().format(DateTimeFormatter.ISO_DATE)
                            : "to";
                    String filename = "schedule_" + fromStr + "_" + toStr + ".xlsx";

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
                    headers.setContentDisposition(
                            ContentDisposition.attachment().filename(filename).build());
                    headers.setContentLength(data.length);

                    return new ResponseEntity<>(data, headers, HttpStatus.OK);
                })
                .onErrorResume(e -> {
                    log.error("[EXPORT] Failed: {}", e.getMessage(), e);
                    return Mono.just(new ResponseEntity<>(new byte[0], HttpStatus.INTERNAL_SERVER_ERROR));
                });
    }
}
