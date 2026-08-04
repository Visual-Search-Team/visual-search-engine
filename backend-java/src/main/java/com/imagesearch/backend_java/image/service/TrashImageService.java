package com.imagesearch.backend_java.image.service;

import com.imagesearch.backend_java.image.dto.response.TrashImageItemResponse;
import com.imagesearch.backend_java.image.dto.response.TrashImageBulkActionResponse;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.repository.ImageRepository;
import com.imagesearch.backend_java.index.dto.IndexingJobResponse;
import com.imagesearch.backend_java.index.dto.PageResponse;
import com.imagesearch.backend_java.index.repository.IndexingJobItemRepository;
import com.imagesearch.backend_java.index.service.IndexingJobService;
import com.imagesearch.backend_java.search.repository.BookmarkRepository;
import com.imagesearch.backend_java.search.repository.ImageOcrRepository;
import com.imagesearch.backend_java.search.service.QdrantVectorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "TRASH-IMAGE-SERVICE")
public class TrashImageService {

    private final ImageRepository imageRepository;
    private final MinIOService minIOService;
    private final QdrantVectorService qdrantVectorService;
    private final ImageOcrRepository imageOcrRepository;
    private final BookmarkRepository bookmarkRepository;
    private final IndexingJobItemRepository indexingJobItemRepository;
    private final IndexingJobService indexingJobService;

    @Value("${app.trash.retention-days:30}")
    private int retentionDays;

    @Transactional(readOnly = true)
    public PageResponse<TrashImageItemResponse> getTrashImages(int page, int size) {
        Page<ImageEntity> trashPage = imageRepository.findByDeletedTrueOrderByDeletedAtDesc(PageRequest.of(page, size));
        List<TrashImageItemResponse> content = trashPage.getContent().stream()
                .map(this::toTrashItem)
                .toList();
        return PageResponse.of(content, page, size, trashPage.getTotalElements());
    }

    @Transactional
    public TrashImageItemResponse restoreImage(Long imageId) {
        RestoreResult result = restoreSingleImage(imageId);
        TrashImageItemResponse response = toTrashItem(result.image());
        response.setRestoredJobId(result.restoredJobId());
        return response;
    }

    @Transactional
    public void permanentlyDeleteImage(Long imageId) {
        permanentlyDeleteSingleImage(imageId);
    }

    @Transactional
    public TrashImageBulkActionResponse restoreImages(List<Long> imageIds) {
        Set<Long> targetIds = normalizeImageIds(imageIds);
        if (targetIds.isEmpty()) {
            throw new IllegalStateException("imageIds must not be empty");
        }

        Set<Long> restoredJobIds = new LinkedHashSet<>();
        for (Long imageId : targetIds) {
            RestoreResult result = restoreSingleImage(imageId);
            restoredJobIds.add(result.restoredJobId());
        }

        return TrashImageBulkActionResponse.builder()
                .affectedCount(targetIds.size())
                .restoredJobIds(restoredJobIds.stream().toList())
                .build();
    }

    @Transactional
    public TrashImageBulkActionResponse restoreAllImages() {
        List<Long> allTrashIds = imageRepository.findByDeletedTrue().stream()
                .map(ImageEntity::getId)
                .toList();

        if (allTrashIds.isEmpty()) {
            return TrashImageBulkActionResponse.builder()
                    .affectedCount(0)
                    .restoredJobIds(List.of())
                    .build();
        }

        return restoreImages(allTrashIds);
    }

    @Transactional
    public int permanentlyDeleteImages(List<Long> imageIds) {
        Set<Long> targetIds = normalizeImageIds(imageIds);
        if (targetIds.isEmpty()) {
            throw new IllegalStateException("imageIds must not be empty");
        }

        for (Long imageId : targetIds) {
            permanentlyDeleteSingleImage(imageId);
        }

        return targetIds.size();
    }

    @Transactional
    public int permanentlyDeleteAllImages() {
        List<Long> allTrashIds = imageRepository.findByDeletedTrue().stream()
                .map(ImageEntity::getId)
                .toList();

        if (allTrashIds.isEmpty()) {
            return 0;
        }

        return permanentlyDeleteImages(allTrashIds);
    }

    @Transactional(readOnly = true)
    public int getRetentionDays() {
        return retentionDays;
    }

    @Scheduled(cron = "${app.trash.purge-cron:0 0 3 * * *}")
    public void purgeExpiredTrashImages() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(retentionDays);
        List<ImageEntity> expiredImages = imageRepository.findByDeletedTrueAndDeletedAtBefore(threshold);

        if (expiredImages.isEmpty()) {
            return;
        }

        int successCount = 0;
        for (ImageEntity image : expiredImages) {
            try {
                permanentlyDeleteImage(image.getId());
                successCount++;
            } catch (Exception ex) {
                log.error("Failed to auto purge image {} from trash", image.getId(), ex);
            }
        }

        log.info("Auto purge finished: {} of {} image(s) permanently deleted", successCount, expiredImages.size());
    }

    private TrashImageItemResponse toTrashItem(ImageEntity image) {
        LocalDateTime deletedAt = image.getDeletedAt() != null ? image.getDeletedAt() : image.getUpdatedAt();
        LocalDateTime expiresAt = deletedAt == null ? null : deletedAt.plusDays(retentionDays);
        long daysUntilPurge = calculateRemainingDays(expiresAt);

        return TrashImageItemResponse.builder()
                .id(image.getId())
                .originalFileName(image.getOriginalFileName())
                .mimeType(image.getMimeType())
                .fileSize(image.getFileSize())
                .width(image.getWidth())
                .height(image.getHeight())
                .imageUrl(minIOService.getPresignedFileUrl(image.getStoragePath()))
                .thumbnailUrl(image.getThumbnailPath() == null || image.getThumbnailPath().isBlank()
                        ? null
                        : minIOService.getPresignedFileUrl(image.getThumbnailPath()))
                .deletedAt(deletedAt)
                .expiresAt(expiresAt)
                .daysUntilPermanentDeletion(daysUntilPurge)
                .build();
    }

    private long calculateRemainingDays(LocalDateTime expiresAt) {
        if (expiresAt == null) {
            return 0;
        }

        Duration duration = Duration.between(LocalDateTime.now(), expiresAt);
        if (duration.isNegative() || duration.isZero()) {
            return 0;
        }

        long seconds = duration.getSeconds();
        long dayInSeconds = 24L * 60L * 60L;
        return (seconds + dayInSeconds - 1) / dayInSeconds;
    }

    private void deleteExternalResources(ImageEntity image) {
        try {
            qdrantVectorService.deleteImageEmbedding(image.getId());
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to delete vector from Qdrant for image " + image.getId() + ": " + ex.getMessage(), ex);
        }

        try {
            minIOService.deleteFile(image.getStoragePath());
            if (image.getThumbnailPath() != null && !image.getThumbnailPath().isBlank()) {
                minIOService.deleteFile(image.getThumbnailPath());
            }
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to delete object from MinIO for image " + image.getId() + ": " + ex.getMessage(), ex);
        }
    }

    private void deleteDatabaseReferences(Long imageId) {
        imageOcrRepository.deleteByImageId(imageId);
        bookmarkRepository.deleteByImageId(imageId);
        indexingJobItemRepository.deleteByImage_Id(imageId);
    }

    private RestoreResult restoreSingleImage(Long imageId) {
        ImageEntity image = imageRepository.findByIdAndDeletedTrue(imageId)
                .orElseThrow(() -> new IllegalStateException("Image not found in trash: " + imageId));

        image.setDeleted(false);
        image.setDeletedAt(null);
        imageRepository.save(image);

        IndexingJobResponse restoredJob = indexingJobService.trackRestoredImage(image);
        return new RestoreResult(image, restoredJob.getId());
    }

    private void permanentlyDeleteSingleImage(Long imageId) {
        ImageEntity image = imageRepository.findByIdAndDeletedTrue(imageId)
                .orElseThrow(() -> new IllegalStateException("Image not found in trash: " + imageId));

        deleteExternalResources(image);
        deleteDatabaseReferences(imageId);
        imageRepository.deleteById(imageId);
    }

    private Set<Long> normalizeImageIds(List<Long> imageIds) {
        if (imageIds == null) {
            return Set.of();
        }

        return imageIds.stream()
                .filter(id -> id != null && id > 0)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    private record RestoreResult(ImageEntity image, Long restoredJobId) {}
}
