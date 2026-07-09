package com.imagesearch.backend_java.batch.entity;

import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.batch.enums.BatchStatus;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.index.entity.IndexingJobEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "batches")
public class BatchEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private BatchStatus status;

    @Column(name = "total_images")
    private Integer totalImages;

    @Column(name = "indexed_images")
    private Integer indexedImages;

    @Column(name = "failed_images")
    private Integer failedImages;

    @OneToMany(mappedBy = "batch")
    private List<IndexingJobEntity> indexingJobs;

    @OneToMany(mappedBy = "batch")
    private List<ImageEntity> images;

    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
