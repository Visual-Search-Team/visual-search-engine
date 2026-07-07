package com.imagesearch.backend_java.batch.dto.response;

import com.imagesearch.backend_java.batch.enums.BatchStatus;
import lombok.*;

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
}
