package com.imagesearch.backend_java.image.service;

import com.imagesearch.backend_java.image.dto.response.ImageUploadResponse;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.repository.ImageRepository;
import com.imagesearch.backend_java.index.service.ImageUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageService {

    private final MinIOService minIOService;
    private final ImageRepository imageRepository;
    private final ImageUploadService imageUploadService;

    // Upload ảnh
    public ImageUploadResponse uploadImage(MultipartFile file) throws Exception {
        return imageUploadService.uploadImages(new MultipartFile[] { file }).stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No upload result returned"));
    }

    // Download ảnh
    public InputStreamResource downloadImage(Long imageId) throws Exception {
        ImageEntity imageEntity = imageRepository.findByIdAndDeletedFalse(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));

        InputStream inputStream = minIOService.downloadFile(imageEntity.getStoragePath());
        return new InputStreamResource(inputStream);
    }

    // Download ảnh trong Trash
    public InputStreamResource downloadTrashImage(Long imageId) throws Exception {
        ImageEntity imageEntity = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));

        InputStream inputStream = minIOService.downloadFile(imageEntity.getStoragePath());
        return new InputStreamResource(inputStream);
    }

    // Xóa ảnh
    @Transactional
    public void deleteImage(Long imageId) throws Exception {
        softDeleteSingleImage(imageId);
    }

    @Transactional
    public int deleteImagesByAdmin(List<Long> imageIds) {
        if (imageIds == null || imageIds.isEmpty()) {
            throw new IllegalStateException("imageIds must not be empty");
        }

        Set<Long> targetIds = new LinkedHashSet<>(imageIds);
        for (Long imageId : targetIds) {
            softDeleteSingleImage(imageId);
        }

        return targetIds.size();
    }

    // Lấy URL ảnh
    public String getImageUrl(Long imageId) throws Exception {
        ImageEntity imageEntity = imageRepository.findByIdAndDeletedFalse(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));

        return minIOService.getPresignedFileUrl(imageEntity.getStoragePath());
    }

    // Lấy URL presigned download
    public String getPresignedDownloadUrl(Long imageId, int expirationHours) throws Exception {
        ImageEntity imageEntity = imageRepository.findByIdAndDeletedFalse(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));

        int expirationSeconds = expirationHours * 3600;
        return minIOService.getPresignedDownloadUrl(imageEntity.getStoragePath(), expirationSeconds);
    }

    // Lấy tên file ảnh
    public String getImageFileName(Long imageId) throws Exception {
        ImageEntity imageEntity = imageRepository.findByIdAndDeletedFalse(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));

        return imageEntity.getOriginalFileName();
    }

    // Kiểm tra xem ảnh có tồn tại
    public boolean imageExists(Long imageId) {
        return imageRepository.existsByIdAndDeletedFalse(imageId);
    }

    // Lấy metadata của ảnh
    public ImageEntity getImageMetadata(Long imageId) {
        return imageRepository.findByIdAndDeletedFalse(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));
    }

    // Lấy metadata của ảnh trong Trash
    public ImageEntity getImageMetadataForTrash(Long imageId) {
        return imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));
    }

    private void softDeleteSingleImage(Long imageId) {
        ImageEntity imageEntity = imageRepository.findByIdAndDeletedFalse(imageId)
                .orElseThrow(() -> new IllegalStateException("Image not found or already deleted: " + imageId));

        imageEntity.setDeleted(true);
        imageEntity.setDeletedAt(LocalDateTime.now());
        imageRepository.save(imageEntity);

        log.info("Image deleted: {}", imageId);
    }
}
