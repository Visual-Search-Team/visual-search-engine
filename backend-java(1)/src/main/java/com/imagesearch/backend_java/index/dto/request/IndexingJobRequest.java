package com.imagesearch.backend_java.index.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IndexingJobRequest {
    private Long batchId;
}
