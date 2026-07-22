package com.imagesearch.backend_java.index.dto;

import com.imagesearch.backend_java.index.enums.JobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IndexingJobSummaryResponse {
    private Long id;
    private JobStatus status;
    private Integer totalImages;
    private Integer successCount;
    private Integer failedCount;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private Double progressPercentage;
}
