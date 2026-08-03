package com.imagesearch.backend_java.index.repository;

import com.imagesearch.backend_java.index.entity.IndexingJobEntity;
import com.imagesearch.backend_java.index.enums.JobStatus;
import com.imagesearch.backend_java.index.enums.JobType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface IndexingJobRepository extends JpaRepository<IndexingJobEntity, Long> {
    Page<IndexingJobEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<IndexingJobEntity> findByStatus(JobStatus status);

    Optional<IndexingJobEntity> findFirstByJobTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            JobType jobType,
            LocalDateTime createdAt
    );
}
