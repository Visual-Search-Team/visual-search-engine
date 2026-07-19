package com.imagesearch.backend_java.index.service;

import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.index.dto.IndexingJobItemResponse;
import com.imagesearch.backend_java.index.dto.IndexingJobResponse;
import com.imagesearch.backend_java.index.dto.IndexingJobSummaryResponse;
import com.imagesearch.backend_java.index.dto.PageResponse;
import com.imagesearch.backend_java.index.dto.request.IndexingJobRequest;

import java.util.List;
import java.util.Map;

public interface IndexingJobService {
    IndexingJobResponse trackUploadedImages(List<ImageEntity> images);

    IndexingJobResponse createIndexingJob(IndexingJobRequest request);

    IndexingJobResponse getIndexingJob(Long jobId);

    PageResponse<IndexingJobSummaryResponse> getIndexingJobs(Map<String, Object> params);

    IndexingJobResponse startIndexing(Long jobId);

    void cancelIndexing(Long jobId);

    PageResponse<IndexingJobItemResponse> getJobItems(Long jobId, Map<String, Object> params);

    IndexingJobResponse retryIndexing(Long jobId);
}
