package com.imagesearch.backend_java.batch.repository;

import com.imagesearch.backend_java.batch.dto.request.BatchSearch;
import com.imagesearch.backend_java.batch.dto.response.BatchSummaryResponse;
import com.imagesearch.backend_java.batch.entity.BatchEntity;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BatchRepositoryCustom {
    List<BatchEntity> getBatches(BatchSearch batchSearch);
}
