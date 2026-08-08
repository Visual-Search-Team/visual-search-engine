package com.imagesearch.backend_java.index.controller;

import com.imagesearch.backend_java.auth.dto.BaseResponse;
import com.imagesearch.backend_java.index.dto.IndexingJobItemResponse;
import com.imagesearch.backend_java.index.dto.IndexingJobResponse;
import com.imagesearch.backend_java.index.dto.IndexingJobSummaryResponse;
import com.imagesearch.backend_java.index.dto.PageResponse;
import com.imagesearch.backend_java.index.dto.request.IndexingJobDeleteImagesRequest;
import com.imagesearch.backend_java.index.dto.request.IndexingJobsDeleteRequest;
import com.imagesearch.backend_java.index.dto.request.IndexingJobRequest;
import com.imagesearch.backend_java.index.dto.request.IndexingJobRetryRequest;
import com.imagesearch.backend_java.index.service.IndexingJobService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/indexing-jobs")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
public class IndexingJobController {

    private final IndexingJobService indexingJobService;

    @PostMapping
    public ResponseEntity<BaseResponse<IndexingJobResponse>> createIndexingJob(
            @RequestBody(required = false) IndexingJobRequest request) {
        try {
            IndexingJobResponse response = indexingJobService.createIndexingJob(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error creating indexing job", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("INDEXING_JOB_CREATE_ERROR", ex.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<BaseResponse<PageResponse<IndexingJobSummaryResponse>>> getIndexingJobs(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        try {
            PageResponse<IndexingJobSummaryResponse> response = indexingJobService.getIndexingJobs(Map.of("page", page, "size", size));
            return ResponseEntity.ok(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error fetching indexing jobs", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("INDEXING_JOB_FETCH_ERROR", ex.getMessage()));
        }
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<BaseResponse<IndexingJobResponse>> getIndexingJob(@PathVariable Long jobId) {
        try {
            return ResponseEntity.ok(BaseResponse.success(indexingJobService.getIndexingJob(jobId)));
        } catch (Exception ex) {
            log.error("Error fetching indexing job", ex);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(BaseResponse.error("INDEXING_JOB_NOT_FOUND", ex.getMessage()));
        }
    }

    @PostMapping("/{jobId}/start")
    public ResponseEntity<BaseResponse<IndexingJobResponse>> startIndexing(@PathVariable Long jobId) {
        try {
            return ResponseEntity.ok(BaseResponse.success(indexingJobService.startIndexing(jobId)));
        } catch (Exception ex) {
            log.error("Error starting indexing job", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("INDEXING_JOB_START_ERROR", ex.getMessage()));
        }
    }

    @PostMapping("/{jobId}/cancel")
    public ResponseEntity<BaseResponse<Void>> cancelIndexing(@PathVariable Long jobId) {
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
        try {
            PageResponse<IndexingJobItemResponse> response = indexingJobService.getJobItems(jobId, Map.of("page", page, "size", size));
            return ResponseEntity.ok(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error fetching indexing job items", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("JOB_ITEMS_FETCH_ERROR", ex.getMessage()));
        }
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<BaseResponse<Map<String, Object>>> getIndexingJobStatus(@PathVariable Long jobId) {
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
        try {
            return ResponseEntity.ok(BaseResponse.success(indexingJobService.retryIndexing(request.getJobId())));
        } catch (Exception ex) {
            log.error("Error retrying indexing job", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("INDEXING_JOB_RETRY_ERROR", ex.getMessage()));
        }
    }

    @DeleteMapping("/{jobId}/images")
    public ResponseEntity<BaseResponse<Map<String, Object>>> deleteImagesFromJob(
            @PathVariable Long jobId,
            @RequestBody IndexingJobDeleteImagesRequest request) {
        try {
            int deletedCount = indexingJobService.deleteImagesFromJob(
                    jobId,
                    request == null ? null : request.getImageIds()
            );
            return ResponseEntity.ok(BaseResponse.success(Map.of(
                    "jobId", jobId,
                    "deletedCount", deletedCount
            )));
        } catch (Exception ex) {
            log.error("Error deleting images from job {}", jobId, ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("INDEXING_JOB_IMAGES_DELETE_ERROR", ex.getMessage()));
        }
    }

    @DeleteMapping("/{jobId}")
    public ResponseEntity<BaseResponse<Void>> deleteJob(@PathVariable Long jobId) {
        try {
            indexingJobService.deleteJobAndImages(jobId);
            return ResponseEntity.ok(BaseResponse.<Void>builder()
                    .success(true)
                    .timestamp(OffsetDateTime.now())
                    .build());
        } catch (Exception ex) {
            log.error("Error deleting job {}", jobId, ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("INDEXING_JOB_DELETE_ERROR", ex.getMessage()));
        }
    }

    @DeleteMapping
    public ResponseEntity<BaseResponse<Map<String, Object>>> deleteJobs(
            @RequestBody(required = false) IndexingJobsDeleteRequest request) {
        try {
            List<Long> jobIds = request == null ? null : request.getJobIds();
            int deletedCount = indexingJobService.deleteJobsAndImages(jobIds);
            return ResponseEntity.ok(BaseResponse.success(Map.of(
                    "deletedCount", deletedCount
            )));
        } catch (Exception ex) {
            log.error("Error deleting jobs", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("INDEXING_JOB_BULK_DELETE_ERROR", ex.getMessage()));
        }
    }
}
