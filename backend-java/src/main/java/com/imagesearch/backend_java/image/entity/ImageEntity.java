package com.imagesearch.backend_java.image.entity;

import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.image.enums.ImageIndexStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(
        name = "images",
        indexes = {
                @Index(name = "idx_images_uploaded_by", columnList = "uploaded_by"),
                @Index(name = "idx_images_index_status", columnList = "index_status"),
                @Index(name = "idx_images_checksum", columnList = "checksum")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    @Column(name = "original_filename", length = 500)
    private String originalFileName;

    @Column(name = "storage_path", nullable = false, length = 1000)
    private String storagePath;

    @Column(name = "thumbnail_path", length = 1000)
    private String thumbnailPath;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    private Integer width;

    private Integer height;

    @Column(name = "checksum", unique = true, length = 128)
    private String checksum;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "index_status", length = 20)
    private ImageIndexStatus indexStatus = ImageIndexStatus.PENDING;

    @Column(name = "indexed_at")
    private LocalDateTime indexedAt;

    @Column(name = "error_message", length = 2000)
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Transient
    private List<Float> embedding;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
