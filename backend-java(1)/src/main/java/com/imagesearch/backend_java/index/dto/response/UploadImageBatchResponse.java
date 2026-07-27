package com.imagesearch.backend_java.index.dto.response;

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
public class UploadImageBatchResponse {
    private Long id;
    private String fileName;
    private Long batchId;
    private String storagePath;
    private Long fileSize;
    private LocalDateTime uploadedAt;
}
