package com.imagesearch.backend_java.index.repository;

import com.imagesearch.backend_java.index.entity.IndexingJobEntity;
import com.imagesearch.backend_java.index.enums.JobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IndexingJobRepository extends JpaRepository<IndexingJobEntity, Long> {
    Page<IndexingJobEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<IndexingJobEntity> findByStatus(JobStatus status);
}
