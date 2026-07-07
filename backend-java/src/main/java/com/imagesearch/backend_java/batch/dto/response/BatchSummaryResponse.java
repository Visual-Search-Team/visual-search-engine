package com.imagesearch.backend_java.batch.dto.response;

import com.imagesearch.backend_java.batch.enums.BatchStatus;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BatchSummaryResponse {
    private Long id;
    private String name;
    private String description;
    private BatchStatus status;
}
