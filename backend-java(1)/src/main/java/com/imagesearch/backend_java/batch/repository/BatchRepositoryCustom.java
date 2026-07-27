package com.imagesearch.backend_java.batch.repository;

import com.imagesearch.backend_java.batch.dto.request.BatchSearch;
import com.imagesearch.backend_java.batch.entity.BatchEntity;

import java.util.List;

public interface BatchRepositoryCustom {
    List<BatchEntity> getBatches(BatchSearch batchSearch);
    long countBatches(BatchSearch batchSearch);
}
