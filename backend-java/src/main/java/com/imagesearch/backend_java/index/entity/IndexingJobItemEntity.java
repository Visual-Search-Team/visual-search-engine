package com.imagesearch.backend_java.index.entity;

import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.index.enums.ImageIndexStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.data.map.repository.config.EnableMapRepositories;

import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "indexing_job_items")
public class IndexingJobItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "job_id")
    private IndexingJobEntity indexingJob;

    @ManyToOne
    @JoinColumn(name = "image_id")
    private ImageEntity image;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ImageIndexStatus status;

    @Column(name = "retry_count")
    private Integer retryCount;

    @Column(name = "processing_time_ms")
    private Long processingTime;

    @Column(name = "error_message")
    private String errorMessage;

    @CreatedDate
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "processed_at")
    private LocalDateTime processedAt;
}
