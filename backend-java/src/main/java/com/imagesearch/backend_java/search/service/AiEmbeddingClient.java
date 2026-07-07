package com.imagesearch.backend_java.search.service;

import com.imagesearch.backend_java.search.config.QdrantProperties;
import com.imagesearch.backend_java.search.dto.request.EmbeddingRequest;
import com.imagesearch.backend_java.search.dto.response.EmbeddingResponse;
import com.imagesearch.backend_java.search.network.OkHttpHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class AiEmbeddingClient {
    private static final String IMAGE_EMBEDDING_PATH = "/api/v1/embeddings/image";
    private static final String TEXT_EMBEDDING_PATH = "/api/v1/embeddings/text";

    private final OkHttpHelper okHttpHelper;
    private final QdrantProperties qdrantProperties;

    @Value("${integration.backend-ai.base-url:http://localhost:8000}")
    private String backendAiBaseUrl;

    @Value("${integration.backend-ai.mock-embedding:true}")
    private boolean mockEmbedding;

    public List<Float> getImageEmbedding(EmbeddingRequest request) throws IOException {
        return getEmbedding(buildUrl(IMAGE_EMBEDDING_PATH), request, "image:" + request.getStoragePath());
    }

    public List<Float> getTextEmbedding(String text) throws IOException {
        EmbeddingRequest request = EmbeddingRequest.builder()
                .type("text")
                .text(text)
                .build();
        return getEmbedding(buildUrl(TEXT_EMBEDDING_PATH), request, "text:" + text);
    }

    private List<Float> getEmbedding(String url, EmbeddingRequest request, String mockSeed) throws IOException {
        if (mockEmbedding) {
            return createMockEmbedding(mockSeed);
        }

        EmbeddingResponse response = okHttpHelper.httpPost(url, null, request, EmbeddingResponse.class, null, null);
        if (response == null || response.getEmbedding() == null || response.getEmbedding().isEmpty()) {
            throw new IOException("AI embedding response is empty");
        }
        return response.getEmbedding();
    }

    private String buildUrl(String path) {
        return backendAiBaseUrl.replaceAll("/+$", "") + path;
    }

    private List<Float> createMockEmbedding(String seed) {
        Random random = new Random(Objects.hashCode(seed));
        List<Float> embedding = new ArrayList<>(qdrantProperties.getVectorSize());
        for (int i = 0; i < qdrantProperties.getVectorSize(); i++) {
            embedding.add((random.nextFloat() * 2) - 1);
        }
        return embedding;
    }
}
