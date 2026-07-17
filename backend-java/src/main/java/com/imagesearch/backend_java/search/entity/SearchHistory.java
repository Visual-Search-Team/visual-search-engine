package com.imagesearch.backend_java.search.entity;

import com.imagesearch.backend_java.search.common.SearchType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "search_history",
        indexes = {
                @Index(name = "idx_search_history_user_id", columnList = "user_id"),
                @Index(name = "idx_search_history_search_type", columnList = "search_type"),
                @Index(name = "idx_search_history_created_at", columnList = "created_at")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "search_type", length = 30)
    private SearchType searchType;

    @Column(name = "query_text", columnDefinition = "text")
    private String queryText;

    @Column(name = "query_image_path", length = 1000)
    private String queryImagePath;

    @Column(name = "query_image_id")
    private Long queryImageId;

    @Column(name = "processing_time_ms")
    private Long processingTimeMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
