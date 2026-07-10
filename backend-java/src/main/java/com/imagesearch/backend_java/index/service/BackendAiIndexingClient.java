package com.imagesearch.backend_java.index.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

@Service
@Slf4j(topic = "BACKEND-AI-INDEXING-CLIENT")
public class BackendAiIndexingClient {

    private final WebClient webClient;

    public BackendAiIndexingClient(@Value("${integration.backend-ai.base-url:http://localhost:8000}") String backendAiBaseUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(backendAiBaseUrl.replaceAll("/+$", ""))
                .build();
    }

    public void triggerIndexing() {
        triggerIndexing(null);
    }

    public void triggerIndexing(Long batchId) {
        log.info("Triggering backend-ai indexing API: POST /api/v1/indexing/trigger");

        TriggerIndexingResponse response = webClient.post()
                .uri("/api/v1/indexing/trigger")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new TriggerIndexingRequest(batchId))
                .retrieve()
                .bodyToMono(TriggerIndexingResponse.class)
                .timeout(Duration.ofSeconds(20))
                .block();

        if (response == null || response.status() == null || !"ok".equalsIgnoreCase(response.status())) {
            throw new IllegalStateException("backend-ai indexing trigger returned invalid response");
        }

        log.info("Successfully triggered backend-ai indexing: {}", response.message());
    }

    private record TriggerIndexingResponse(String status, String message) {
    }

    private record TriggerIndexingRequest(Long batchId) {
    }
}
