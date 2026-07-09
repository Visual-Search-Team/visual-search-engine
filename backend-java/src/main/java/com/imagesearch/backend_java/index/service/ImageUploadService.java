package com.imagesearch.backend_java.index.service;

import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import com.imagesearch.backend_java.batch.entity.BatchEntity;
import com.imagesearch.backend_java.batch.repository.BatchRepository;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.enums.ImageIndexStatus;
import com.imagesearch.backend_java.image.repository.ImageRepository;
import com.imagesearch.backend_java.image.service.MinIOService;
import com.imagesearch.backend_java.index.dto.UploadImageBatchResponse;
import com.imagesearch.backend_java.index.exception.InvalidBatchForIndexingException;
import com.imagesearch.backend_java.index.exception.ImageUploadFailedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "IMAGE-UPLOAD-SERVICE")
public class ImageUploadService {

    private final BatchRepository batchRepository;
    private final ImageRepository imageRepository;
    private final UserRepository userRepository;
    private final MinIOService minIOService;

    @Transactional
    public List<UploadImageBatchResponse> uploadImageBatch(Long batchId, MultipartFile[] files) {
        log.info("Uploading {} images to batch: {}", files.length, batchId);

        BatchEntity batch = batchRepository.findById(batchId)
                .orElseThrow(() -> {
                    log.warn("Batch not found: {}", batchId);
                    return new InvalidBatchForIndexingException("Batch not found: " + batchId);
                });

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : null;

        User uploadedBy = null;
        if (username != null) {
            uploadedBy = userRepository.findByUsername(username).orElse(null);
        }

        List<UploadImageBatchResponse> responses = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                if (file.isEmpty()) {
                    log.warn("Skipping empty file");
                    continue;
                }

                String checksum = generateChecksum(file);
                
                // Check if image already exists by checksum
                if (imageRepository.findByChecksum(checksum).isPresent()) {
                    log.warn("Image with checksum {} already exists", checksum);
                    continue;
                }

                String storagePath = minIOService.uploadFile(file);
                String originalFileName = file.getOriginalFilename();
                String mimeType = file.getContentType();
                Long fileSize = file.getSize();

                ImageEntity image = ImageEntity.builder()
                        .batch(batch)
                        .uploadedBy(uploadedBy)
                        .originalFileName(originalFileName)
                        .storagePath(storagePath)
                        .mimeType(mimeType)
                        .fileSize(fileSize)
                        .checksum(checksum)
                        .indexStatus(ImageIndexStatus.PENDING)
                        .build();

                imageRepository.save(image);

                log.info("Image uploaded successfully: {} (batch: {}, size: {})", originalFileName, batchId, fileSize);

                UploadImageBatchResponse response = UploadImageBatchResponse.builder()
                        .id(image.getId())
                        .fileName(originalFileName)
                        .batchId(batchId)
                        .storagePath(storagePath)
                        .fileSize(fileSize)
                        .uploadedAt(LocalDateTime.now())
                        .build();

                responses.add(response);

            } catch (IOException ex) {
                log.error("Error uploading file: {}", file.getOriginalFilename(), ex);
                throw new ImageUploadFailedException("Failed to upload file: " + file.getOriginalFilename(), ex);
            } catch (Exception ex) {
                log.error("Unexpected error uploading file: {}", file.getOriginalFilename(), ex);
                throw new ImageUploadFailedException("Failed to upload file: " + file.getOriginalFilename(), ex);
            }
        }

        log.info("Uploaded {} images to batch: {}", responses.size(), batchId);

        // Update batch totalImages
        try {
            int uploadedCount = responses.size();
            if (uploadedCount > 0) {
                Integer currentTotal = batch.getTotalImages();
                if (currentTotal == null) {
                    currentTotal = 0;
                }
                batch.setTotalImages(currentTotal + uploadedCount);
                batchRepository.save(batch);
                log.info("Updated batch {} totalImages to {}", batchId, batch.getTotalImages());
            }
        } catch (Exception ex) {
            log.error("Failed to update batch totalImages for batch {}", batchId, ex);
            // Do not fail the whole upload if batch total update fails
        }

        return responses;
    }

    private String generateChecksum(MultipartFile file) throws IOException {
        byte[] fileBytes = file.getBytes();
        return UUID.nameUUIDFromBytes(fileBytes).toString();
    }
}
