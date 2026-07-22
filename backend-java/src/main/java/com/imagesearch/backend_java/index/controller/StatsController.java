package com.imagesearch.backend_java.index.controller;

import com.imagesearch.backend_java.auth.repository.UserRepository;
import com.imagesearch.backend_java.auth.dto.BaseResponse;
import com.imagesearch.backend_java.image.enums.ImageIndexStatus;
import com.imagesearch.backend_java.image.repository.ImageRepository;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
public class StatsController {
    private final ImageRepository imageRepository;
    private final UserRepository userRepository;

    @GetMapping("/stats")
    public ResponseEntity<BaseResponse<Map<String, Long>>> getStats() {
        log.info("GET /admin/stats: Fetch admin dashboard stats");
        Map<String, Long> stats = new LinkedHashMap<>();
        stats.put("totalImages", imageRepository.count());
        stats.put("pending", imageRepository.countByIndexStatus(ImageIndexStatus.PENDING));
        stats.put("processing", imageRepository.countByIndexStatus(ImageIndexStatus.PROCESSING));
        stats.put("indexed", imageRepository.countByIndexStatus(ImageIndexStatus.INDEXED));
        stats.put("failed", imageRepository.countByIndexStatus(ImageIndexStatus.FAILED));
        stats.put("totalUsers", userRepository.count());
        return ResponseEntity.ok(BaseResponse.success(stats));
    }
}
