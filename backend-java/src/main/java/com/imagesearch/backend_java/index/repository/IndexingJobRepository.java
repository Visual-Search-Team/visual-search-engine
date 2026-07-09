package com.imagesearch.backend_java.index.repository;

import com.imagesearch.backend_java.index.entity.IndexingJobEntity;
import com.imagesearch.backend_java.index.enums.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface IndexingJobRepository extends JpaRepository<IndexingJobEntity, Long> {
    List<IndexingJobEntity> findByBatchIdOrderByCreatedAtDesc(Long batchId);

    Optional<IndexingJobEntity> findByBatchIdAndStatus(Long batchId, JobStatus status);

    List<IndexingJobEntity> findByStatus(JobStatus status);

    Long countByBatchIdAndStatus(Long batchId, JobStatus status);

    @Query(value = "SELECT * FROM indexing_jobs WHERE batch_id = :batchId ORDER BY created_at DESC LIMIT :limit OFFSET :offset", 
           nativeQuery = true)
    List<IndexingJobEntity> findByBatchIdPaged(@Param("batchId") Long batchId, 
                                               @Param("offset") Integer offset, 
                                               @Param("limit") Integer limit);

    @Query(value = "SELECT COUNT(*) FROM indexing_jobs WHERE batch_id = :batchId", 
           nativeQuery = true)
    Long countByBatchId(@Param("batchId") Long batchId);
}
