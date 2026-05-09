package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.services.MinioService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.ByteArrayInputStream;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/upload")
public class UploadController {

    private final MinioService minioService;

    @PostMapping
    public Mono<Map<String, String>> upload(@RequestPart("file") FilePart file) {
        if (file == null || file.filename().isEmpty()) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Файл не передан"));
        }

        String contentType = file.headers().getContentType() != null
                ? file.headers().getContentType().toString()
                : "application/octet-stream";

        return DataBufferUtils.join(file.content())
                .publishOn(Schedulers.boundedElastic())
                .map(buffer -> {
                    byte[] bytes = new byte[buffer.readableByteCount()];
                    buffer.read(bytes);
                    DataBufferUtils.release(buffer);
                    return bytes;
                })
                .map(bytes -> {
                    String url = minioService.uploadStream(
                            new ByteArrayInputStream(bytes),
                            file.filename(),
                            "uploads",
                            contentType);
                    return Map.of("url", url);
                });
    }
}
