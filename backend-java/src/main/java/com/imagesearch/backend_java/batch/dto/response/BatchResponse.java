package com.imagesearch.backend_java.batch.dto.response;

import com.imagesearch.backend_java.batch.enums.BatchStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BatchResponse {
    private Long id;
    private String name;
    private String description;
    private BatchStatus status;
    private Integer totalImages;
    private Integer indexedImages;
    private Integer failedImages;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public double getProgressPercentage() {
        if (totalImages == null || totalImages == 0) {
            return 0;
        }
        return Math.round((double) (indexedImages != null ? indexedImages : 0) / totalImages * 100 * 100.0) / 100.0;
    }
}
