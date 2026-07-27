package com.imagesearch.backend_java.search.config;

import lombok.Getter;
import okhttp3.MediaType;
import org.springframework.context.annotation.Configuration;

import java.util.Set;

@Getter
@Configuration
public class SearchConfig {
    private final String imageEmbeddingPath = "/api/v1/embeddings/image";
    private final String textEmbeddingPath = "/api/v1/embeddings/text";
    private final long maxImageSizeBytes = 10 * 1024 * 1024;
    private final int defaultSearchLimit = 20;
    private final int defaultPage = 0;
    private final int defaultPageSize = 20;
    private final Set<String> supportedImageTypes = Set.of("image/jpeg", "image/png", "image/webp");
    private final MediaType jsonMediaType = MediaType.parse("application/json; charset=utf-8");
}
