package com.imagesearch.backend_java.search.dto.request;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmbeddingRequest {
    private String type;
    private String text;
    private String imageUrl;
    private String storagePath;
    private String mimeType;
}
