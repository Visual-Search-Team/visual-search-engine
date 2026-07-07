package com.imagesearch.backend_java.batch.controller;

import com.imagesearch.backend_java.batch.dto.request.BatchRequest;
import com.imagesearch.backend_java.batch.dto.response.BatchResponse;
import com.imagesearch.backend_java.batch.dto.response.BatchSummaryResponse;
import com.imagesearch.backend_java.batch.service.BatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/visual-search/v1/admin/batches")
public class BatchController {
    private final BatchService batchService;

    @PostMapping
    public BatchResponse createBatch(@RequestBody BatchRequest request){
        return batchService.createBatch(request);
    }

    @GetMapping("/{id}")
    public BatchResponse getBatch(@PathVariable Long id){
        return batchService.getBatch(id);
    }

    @PutMapping("/{id}")
    public BatchResponse updateBatch(@PathVariable Long id,@RequestBody BatchRequest request){
        return batchService.updateBatch(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteBatch(@PathVariable Long id){
        batchService.deleteBatch(id);
    }

    @GetMapping
    public List<BatchSummaryResponse> getBatches(){
        return batchService.getAllBatches();
    }
}
