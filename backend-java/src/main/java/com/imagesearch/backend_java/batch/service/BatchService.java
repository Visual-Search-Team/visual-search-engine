package com.imagesearch.backend_java.batch.service;

import com.imagesearch.backend_java.batch.dto.request.BatchRequest;
import com.imagesearch.backend_java.batch.dto.request.BatchSearch;
import com.imagesearch.backend_java.batch.dto.response.BatchResponse;
import com.imagesearch.backend_java.batch.dto.response.BatchSummaryResponse;

import java.util.List;
import java.util.Map;

public interface BatchService {
    BatchResponse createBatch(BatchRequest request);
    BatchResponse getBatch(Long id);
    BatchResponse updateBatch(Long id, BatchRequest request);
    void deleteBatch(Long id);
    List<BatchSummaryResponse> getBatches(Map<String, Object> params);
}
