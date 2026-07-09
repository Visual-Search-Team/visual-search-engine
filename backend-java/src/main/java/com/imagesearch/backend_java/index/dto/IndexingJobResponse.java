package com.imagesearch.backend_java.index.dto;

import com.imagesearch.backend_java.index.enums.JobStatus;
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
public class IndexingJobResponse {
    private Long id;
    private Long batchId;
    private JobStatus status;
    private Integer totalImages;
    private Integer successCount;
    private Integer failedCount;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private Double progressPercentage;

    public Double getProgressPercentage() {
        if (totalImages == null || totalImages == 0) {
            return 0.0;
        }
        int completedCount = (successCount != null ? successCount : 0) + 
                             (failedCount != null ? failedCount : 0);
        return (completedCount * 100.0) / totalImages;
    }
}
