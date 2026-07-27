package com.imagesearch.backend_java.batch.controller;

import com.imagesearch.backend_java.auth.dto.BaseResponse;
import com.imagesearch.backend_java.batch.dto.request.BatchRequest;
import com.imagesearch.backend_java.batch.dto.response.BatchResponse;
import com.imagesearch.backend_java.batch.dto.response.BatchSummaryResponse;
import com.imagesearch.backend_java.batch.dto.response.PageResponse;
import com.imagesearch.backend_java.batch.service.BatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/batches")
@Slf4j(topic = "BATCH-CONTROLLER")
@Tag(name = "Batch Management", description = "APIs for batch management and indexing")
public class BatchController {
    private final BatchService batchService;

    @Operation(summary = "Create a new batch", description = "Create a new batch for image indexing")
    @PostMapping
    public ResponseEntity<BaseResponse<BatchResponse>> createBatch(@Valid @RequestBody BatchRequest request) {
        log.info("Entered createBatch API, batch name: {}", request.getName());
        try {
            BatchResponse data = batchService.createBatch(request);
            BaseResponse<BatchResponse> response = BaseResponse.<BatchResponse>builder()
                    .success(true)
                    .data(data)
                    .error(null)
                    .timestamp(OffsetDateTime.now())
                    .build();
            log.info("Completed createBatch API, batch id: {}", data.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception ex) {
            log.error("Error in createBatch API: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Operation(summary = "Get batch by ID", description = "Retrieve batch details by batch ID")
    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<BatchResponse>> getBatch(@PathVariable Long id) {
        log.info("Entered getBatch API, batch id: {}", id);
        try {
            BatchResponse data = batchService.getBatch(id);
            BaseResponse<BatchResponse> response = BaseResponse.<BatchResponse>builder()
                    .success(true)
                    .data(data)
                    .error(null)
                    .timestamp(OffsetDateTime.now())
                    .build();
            log.info("Completed getBatch API, batch id: {}", id);
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            log.error("Error in getBatch API: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Operation(summary = "Update batch", description = "Update batch details")
    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<BatchResponse>> updateBatch(@PathVariable Long id,
                                                                    @Valid @RequestBody BatchRequest request) {
        log.info("Entered updateBatch API, batch id: {}, new name: {}", id, request.getName());
        try {
            BatchResponse data = batchService.updateBatch(id, request);
            BaseResponse<BatchResponse> response = BaseResponse.<BatchResponse>builder()
                    .success(true)
                    .data(data)
                    .error(null)
                    .timestamp(OffsetDateTime.now())
                    .build();
            log.info("Completed updateBatch API, batch id: {}", id);
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            log.error("Error in updateBatch API: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Operation(summary = "Delete batch", description = "Delete a batch (soft delete)")
    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteBatch(@PathVariable Long id) {
        log.info("Entered deleteBatch API, batch id: {}", id);
        try {
            batchService.deleteBatch(id);
            BaseResponse<Void> response = BaseResponse.<Void>builder()
                    .success(true)
                    .data(null)
                    .error(null)
                    .timestamp(OffsetDateTime.now())
                    .build();
            log.info("Completed deleteBatch API, batch id: {}", id);
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            log.error("Error in deleteBatch API: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Operation(summary = "List batches with pagination", description = "Retrieve paginated list of batches with optional filters")
    @GetMapping
    public ResponseEntity<BaseResponse<PageResponse<BatchSummaryResponse>>> getBatches(
            @RequestParam(required = false) Map<String, Object> params) {
        log.info("Entered getBatches API with params: {}", params);
        try {
            PageResponse<BatchSummaryResponse> data = batchService.getBatches(params);
            BaseResponse<PageResponse<BatchSummaryResponse>> response = BaseResponse.<PageResponse<BatchSummaryResponse>>builder()
                    .success(true)
                    .data(data)
                    .error(null)
                    .timestamp(OffsetDateTime.now())
                    .build();
            log.info("Completed getBatches API, returned {} items on page {}", data.getContent().size(), data.getPage());
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            log.error("Error in getBatches API: {}", ex.getMessage(), ex);
            throw ex;
        }
    }
}
