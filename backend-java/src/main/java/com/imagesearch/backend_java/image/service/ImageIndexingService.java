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
        log.info("Starting async indexing for image {}", imageId);
        ImageEntity image = imageRepository.findById(imageId).orElse(null);
        if (image == null) {
            log.warn("Image {} not found for indexing", imageId);
            return;
        }

        try {
            image.setIndexStatus(ImageIndexStatus.PROCESSING);
            image.setErrorMessage(null);
            imageRepository.save(image);

            String imageUrl = minIOService.getPresignedFileUrl(image.getStoragePath());
            List<Float> embedding = aiEmbeddingClient.getImageEmbedding(EmbeddingRequest.builder()
                    .type("image")
                    .storagePath(image.getStoragePath())
                    .imageUrl(imageUrl)
                    .mimeType(image.getMimeType())
                    .build());

            image.setEmbedding(embedding);
            qdrantVectorService.upsertImageEmbedding(image);

            image.setIndexStatus(ImageIndexStatus.INDEXED);
            image.setIndexedAt(LocalDateTime.now());
            image.setErrorMessage(null);
            imageRepository.save(image);
            log.info("Finished indexing image {}", imageId);
        } catch (IOException ex) {
            log.error("Failed to index image {}", imageId, ex);
            markFailed(image, ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error while indexing image {}", imageId, ex);
            markFailed(image, ex.getMessage());
        }
    }

    private void markFailed(ImageEntity image, String message) {
        image.setIndexStatus(ImageIndexStatus.FAILED);
        image.setErrorMessage(message);
        image.setIndexedAt(null);
        imageRepository.save(image);
    }
}
