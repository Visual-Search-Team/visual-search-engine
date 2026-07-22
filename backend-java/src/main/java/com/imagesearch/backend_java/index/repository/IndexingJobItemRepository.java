package com.imagesearch.backend_java.index.repository;

import com.imagesearch.backend_java.image.enums.ImageIndexStatus;
import com.imagesearch.backend_java.index.entity.IndexingJobItemEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IndexingJobItemRepository extends JpaRepository<IndexingJobItemEntity, Long> {
    List<IndexingJobItemEntity> findByIndexingJobId(Long jobId);

    Page<IndexingJobItemEntity> findByIndexingJobId(Long jobId, Pageable pageable);

    List<IndexingJobItemEntity> findByIndexingJobIdAndStatus(Long jobId, ImageIndexStatus status);

    Long countByIndexingJobIdAndStatus(Long jobId, ImageIndexStatus status);
}
