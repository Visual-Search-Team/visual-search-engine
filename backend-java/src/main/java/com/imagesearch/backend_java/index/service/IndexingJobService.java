package com.imagesearch.backend_java.index.service;

import com.imagesearch.backend_java.index.dto.IndexingJobItemResponse;
import com.imagesearch.backend_java.index.dto.request.IndexingJobRequest;
import com.imagesearch.backend_java.index.dto.IndexingJobResponse;
import com.imagesearch.backend_java.index.dto.IndexingJobSummaryResponse;
import com.imagesearch.backend_java.batch.dto.response.PageResponse;

import java.util.Map;

public interface IndexingJobService {
    IndexingJobResponse createIndexingJob(IndexingJobRequest request);

    IndexingJobResponse getIndexingJob(Long jobId);

    PageResponse<IndexingJobSummaryResponse> getIndexingJobsByBatch(Long batchId, Map<String, Object> params);

    IndexingJobResponse startIndexing(Long jobId);

    void cancelIndexing(Long jobId);

    PageResponse<IndexingJobItemResponse> getJobItems(Long jobId, Map<String, Object> params);
}
