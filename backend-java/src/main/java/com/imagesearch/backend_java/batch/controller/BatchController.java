package com.imagesearch.backend_java.batch.controller;

import com.imagesearch.backend_java.batch.dto.request.BatchRequest;
import com.imagesearch.backend_java.batch.dto.response.BatchResponse;
import com.imagesearch.backend_java.batch.dto.response.BatchSummaryResponse;
import com.imagesearch.backend_java.batch.service.BatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/visual-search/v1/admin/batches")
public class BatchController {
    private final BatchService batchService;

    @PostMapping
    public BatchResponse createBatch(@Valid @RequestBody BatchRequest request){
        return batchService.createBatch(request);
    }

    @GetMapping("/{id}")
    public BatchResponse getBatch(@PathVariable Long id){
        return batchService.getBatch(id);
    }

    @PutMapping("/{id}")
    public BatchResponse updateBatch(@PathVariable Long id,@Valid @RequestBody BatchRequest request){
        return batchService.updateBatch(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteBatch(@PathVariable Long id) {
        batchService.deleteBatch(id);
    }

    @GetMapping
    public List<BatchSummaryResponse> getBatches(@RequestParam(required = false)Map<String, Object> params){
        return batchService.getBatches(params);
    }
}
