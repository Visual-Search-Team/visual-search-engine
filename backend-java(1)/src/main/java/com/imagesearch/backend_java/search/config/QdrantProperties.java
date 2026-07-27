package com.imagesearch.backend_java.search.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "integration.qdrant")
public class QdrantProperties {
    private String url;
    private String collectionName = "images";
    private String vectorName = "embedding";
    private int vectorSize = 512;
    private String distance = "Cosine";
    private boolean initializeOnStartup = true;
}
