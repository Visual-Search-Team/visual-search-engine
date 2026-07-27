package com.imagesearch.backend_java.index.repository;

import com.imagesearch.backend_java.index.entity.IndexingJobItemEntity;
import com.imagesearch.backend_java.index.enums.ImageIndexStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IndexingJobItemRepository extends JpaRepository<IndexingJobItemEntity, Long> {
    List<IndexingJobItemEntity> findByIndexingJobId(Long jobId);

    List<IndexingJobItemEntity> findByIndexingJobIdAndStatus(Long jobId, ImageIndexStatus status);

    Long countByIndexingJobIdAndStatus(Long jobId, ImageIndexStatus status);

    @Query(value = "SELECT * FROM indexing_job_items WHERE job_id = :jobId ORDER BY created_at DESC LIMIT :limit OFFSET :offset", 
           nativeQuery = true)
    List<IndexingJobItemEntity> findByJobIdPaged(@Param("jobId") Long jobId, 
                                                 @Param("offset") Integer offset, 
                                                 @Param("limit") Integer limit);

    @Query(value = "SELECT COUNT(*) FROM indexing_job_items WHERE job_id = :jobId", 
           nativeQuery = true)
    Long countByJobId(@Param("jobId") Long jobId);
}
