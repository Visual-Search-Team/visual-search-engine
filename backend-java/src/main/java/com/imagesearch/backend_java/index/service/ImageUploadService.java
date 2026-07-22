package com.imagesearch.backend_java.index.service;

import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import com.imagesearch.backend_java.image.dto.response.ImageUploadResponse;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.enums.ImageIndexStatus;
import com.imagesearch.backend_java.image.repository.ImageRepository;
import com.imagesearch.backend_java.image.service.ImageIndexingService;
import com.imagesearch.backend_java.image.service.ImageThumbnailService;
import com.imagesearch.backend_java.image.service.MinIOService;
import com.imagesearch.backend_java.index.dto.IndexingJobResponse;
import com.imagesearch.backend_java.index.exception.ImageUploadFailedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "IMAGE-UPLOAD-SERVICE")
public class ImageUploadService {

    private final ImageRepository imageRepository;
    private final UserRepository userRepository;
    private final MinIOService minIOService;
    private final ImageIndexingService imageIndexingService;
    private final IndexingJobService indexingJobService;
    private final ImageThumbnailService imageThumbnailService;

    @Transactional
    public List<ImageUploadResponse> uploadImages(MultipartFile[] files) {
        log.info("Uploading {} images directly", files == null ? 0 : files.length);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : null;

        User uploadedBy = null;
        if (username != null) {
            uploadedBy = userRepository.findByUsername(username).orElse(null);
        }

        List<ImageUploadResponse> responses = new ArrayList<>();
        List<ImageEntity> savedImages = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                if (file == null || file.isEmpty()) {
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
                ImageThumbnailService.ThumbnailResult thumbnail = imageThumbnailService.createThumbnail(file);
                String originalFileName = file.getOriginalFilename();
                String mimeType = file.getContentType();
                Long fileSize = file.getSize();

                ImageEntity image = ImageEntity.builder()
                        .uploadedBy(uploadedBy)
                        .originalFileName(originalFileName)
                        .storagePath(storagePath)
                        .thumbnailPath(thumbnail.thumbnailPath())
                        .mimeType(mimeType)
                        .fileSize(fileSize)
                        .width(thumbnail.width())
                        .height(thumbnail.height())
                        .checksum(checksum)
                        .indexStatus(ImageIndexStatus.PROCESSING)
                        .build();

                ImageEntity savedImage = imageRepository.save(image);
                    savedImages.add(savedImage);

                log.info("Image uploaded successfully: {} (size: {})", originalFileName, fileSize);

            } catch (IOException ex) {
                log.error("Error uploading file: {}", file.getOriginalFilename(), ex);
                throw new ImageUploadFailedException("Failed to upload file: " + file.getOriginalFilename(), ex);
            } catch (Exception ex) {
                log.error("Unexpected error uploading file: {}", file.getOriginalFilename(), ex);
                throw new ImageUploadFailedException("Failed to upload file: " + file.getOriginalFilename(), ex);
            }
        }

        if (!savedImages.isEmpty()) {
            IndexingJobResponse indexingJob = indexingJobService.trackUploadedImages(savedImages);
            scheduleIndexingAfterCommit(savedImages);

            for (ImageEntity savedImage : savedImages) {
                ImageUploadResponse response = ImageUploadResponse.builder()
                        .imageId(savedImage.getId())
                        .indexJobId(indexingJob.getId())
                        .storagePath(savedImage.getStoragePath())
                        .fileUrl(minIOService.getPresignedFileUrl(savedImage.getStoragePath()))
                        .originalFileName(savedImage.getOriginalFileName())
                        .fileSize(savedImage.getFileSize())
                        .mimeType(savedImage.getMimeType())
                        .thumbnailPath(savedImage.getThumbnailPath())
                        .thumbnailUrl(savedImage.getThumbnailPath() == null ? null : minIOService.getPresignedFileUrl(savedImage.getThumbnailPath()))
                        .width(savedImage.getWidth())
                        .height(savedImage.getHeight())
                        .status(savedImage.getIndexStatus().name())
                        .build();

                responses.add(response);
            }
        }

        log.info("Uploaded {} images directly", responses.size());

        return responses;
    }

    private String generateChecksum(MultipartFile file) throws IOException {
        byte[] fileBytes = file.getBytes();
        return UUID.nameUUIDFromBytes(fileBytes).toString();
    }

    private void scheduleIndexingAfterCommit(List<ImageEntity> images) {
        List<Long> imageIds = images.stream()
                .filter(image -> image != null && image.getId() != null)
                .map(ImageEntity::getId)
                .distinct()
                .collect(Collectors.toList());

        if (imageIds.isEmpty()) {
            return;
        }

        Runnable dispatch = () -> imageIds.forEach(imageIndexingService::indexImageAsync);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            dispatch.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                dispatch.run();
            }
        });
    }
}
