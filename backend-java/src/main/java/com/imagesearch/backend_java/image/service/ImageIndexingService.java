package com.imagesearch.backend_java.image.service;

import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.enums.ImageIndexStatus;
import com.imagesearch.backend_java.image.repository.ImageRepository;
import com.imagesearch.backend_java.search.dto.request.EmbeddingRequest;
import com.imagesearch.backend_java.search.service.AiEmbeddingClient;
import com.imagesearch.backend_java.search.service.QdrantVectorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "IMAGE-INDEXING-SERVICE")
public class ImageIndexingService {

    private final ImageRepository imageRepository;
    private final AiEmbeddingClient aiEmbeddingClient;
    private final QdrantVectorService qdrantVectorService;
    private final MinIOService minIOService;

    @Async
    @Transactional
    public void indexImageAsync(Long imageId) {
        // DO NOTHING. 
        // The Python backend-ai APScheduler background worker 
        // will automatically poll the database for PENDING images and process them in batches.
        // Doing HTTP requests here for each image would DDOS the Python server and cause OOM.
        log.info("Image {} uploaded. Python background worker will index it automatically in the next polling cycle.", imageId);
    }

    private void markFailed(ImageEntity image, String message) {
        image.setIndexStatus(ImageIndexStatus.FAILED);
        image.setErrorMessage(message);
        image.setIndexedAt(null);
        imageRepository.save(image);
    }
}
