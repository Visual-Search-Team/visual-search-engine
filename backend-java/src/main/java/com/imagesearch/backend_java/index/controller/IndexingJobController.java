package com.imagesearch.backend_java.index.controller;

import com.imagesearch.backend_java.auth.dto.BaseResponse;
import com.imagesearch.backend_java.batch.dto.response.PageResponse;
import com.imagesearch.backend_java.index.dto.IndexingJobItemResponse;
import com.imagesearch.backend_java.index.dto.request.IndexingJobRequest;
import com.imagesearch.backend_java.index.dto.IndexingJobResponse;
import com.imagesearch.backend_java.index.service.IndexingJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;
import com.imagesearch.backend_java.index.dto.request.IndexingJobRetryRequest;

@RestController
@RequestMapping("/admin/indexing-jobs")
@RequiredArgsConstructor
@Slf4j
public class IndexingJobController {

    private final IndexingJobService indexingJobService;

    @PostMapping
    public ResponseEntity<BaseResponse<IndexingJobResponse>> createIndexingJob(@RequestBody IndexingJobRequest request) {
        log.info("POST /indexing-jobs: Create indexing job for batch {}", request.getBatchId());
        try {
            IndexingJobResponse response = indexingJobService.createIndexingJob(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error creating indexing job", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("INDEXING_JOB_CREATE_ERROR", ex.getMessage()));
        }
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<BaseResponse<IndexingJobResponse>> getIndexingJob(@PathVariable Long jobId) {
        log.info("GET /indexing-jobs/{}: Fetch indexing job", jobId);
        try {
            IndexingJobResponse response = indexingJobService.getIndexingJob(jobId);
            return ResponseEntity.ok(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error fetching indexing job", ex);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(BaseResponse.error("INDEXING_JOB_NOT_FOUND", ex.getMessage()));
        }
    }

    @PostMapping("/{jobId}/start")
    public ResponseEntity<BaseResponse<IndexingJobResponse>> startIndexing(@PathVariable Long jobId) {
        log.info("POST /indexing-jobs/{}/start: Start indexing", jobId);
        try {
            IndexingJobResponse response = indexingJobService.startIndexing(jobId);
            return ResponseEntity.ok(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error starting indexing job", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("INDEXING_JOB_START_ERROR", ex.getMessage()));
        }
    }

    @PostMapping("/{jobId}/cancel")
    public ResponseEntity<BaseResponse<Void>> cancelIndexing(@PathVariable Long jobId) {
        log.info("POST /indexing-jobs/{}/cancel: Cancel indexing", jobId);
        try {
            indexingJobService.cancelIndexing(jobId);
            return ResponseEntity.ok(BaseResponse.<Void>builder()
                    .success(true)
                    .timestamp(OffsetDateTime.now())
                    .build());
        } catch (Exception ex) {
            log.error("Error cancelling indexing job", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("INDEXING_JOB_CANCEL_ERROR", ex.getMessage()));
        }
    }

    @GetMapping("/{jobId}/items")
    public ResponseEntity<BaseResponse<PageResponse<IndexingJobItemResponse>>> getJobItems(
            @PathVariable Long jobId,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        log.info("GET /indexing-jobs/{}/items: Fetch job items with page={}, size={}", jobId, page, size);
        try {
            Map<String, Object> params = Map.of("page", page, "size", size);
            PageResponse<IndexingJobItemResponse> response = indexingJobService.getJobItems(jobId, params);
            return ResponseEntity.ok(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error fetching job items", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("JOB_ITEMS_FETCH_ERROR", ex.getMessage()));
        }
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<BaseResponse<Map<String, Object>>> getIndexingJobStatus(@PathVariable Long jobId) {
        log.info("GET /indexing-jobs/status/{}: Fetch indexing job status", jobId);
        try {
            IndexingJobResponse response = indexingJobService.getIndexingJob(jobId);
            Map<String, Object> payload = Map.of(
                    "id", response.getId(),
                    "status", response.getStatus(),
                    "progressPercentage", response.getProgressPercentage()
            );
            return ResponseEntity.ok(BaseResponse.success(payload));
        } catch (Exception ex) {
            log.error("Error fetching indexing job status", ex);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(BaseResponse.error("INDEXING_JOB_NOT_FOUND", ex.getMessage()));
        }
    }

    @PostMapping("/retry")
    public ResponseEntity<BaseResponse<IndexingJobResponse>> retryIndexingJob(@RequestBody IndexingJobRetryRequest request) {
        log.info("POST /indexing-jobs/retry: Retry indexing job {}", request.getJobId());
        try {
            IndexingJobResponse response = indexingJobService.retryIndexing(request.getJobId());
            return ResponseEntity.ok(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error retrying indexing job", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("INDEXING_JOB_RETRY_ERROR", ex.getMessage()));
        }
    }
}
