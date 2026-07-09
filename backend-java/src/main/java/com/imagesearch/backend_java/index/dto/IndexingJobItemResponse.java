package com.imagesearch.backend_java.index.dto;

import com.imagesearch.backend_java.index.enums.ImageIndexStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IndexingJobItemResponse {
    private Long id;
    private Long jobId;
    private Long imageId;
    private ImageIndexStatus status;
    private Integer retryCount;
    private Long processingTime;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
}
