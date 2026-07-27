package com.imagesearch.backend_java.index.controller;

import com.imagesearch.backend_java.auth.dto.BaseResponse;
import com.imagesearch.backend_java.index.service.IndexingJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
public class StatsController {
    private final IndexingJobService indexingJobService;

    @GetMapping("/stats")
    public ResponseEntity<BaseResponse<Map<String, Long>>> getStats() {
        log.info("GET /admin/stats: Fetch indexing stats");
        Map<String, Long> stats = indexingJobService.getStats();
        return ResponseEntity.ok(BaseResponse.success(stats));
    }
}
