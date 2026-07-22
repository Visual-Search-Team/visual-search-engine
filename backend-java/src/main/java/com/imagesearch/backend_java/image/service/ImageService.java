package com.imagesearch.backend_java.image.service;

import com.imagesearch.backend_java.image.dto.response.ImageUploadResponse;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.repository.ImageRepository;
import com.imagesearch.backend_java.index.service.ImageUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageService {

    private final MinIOService minIOService;
    private final ImageRepository imageRepository;
    private final ImageUploadService imageUploadService;

    // Upload ảnh
    public ImageUploadResponse uploadImage(MultipartFile file) throws Exception {
        return imageUploadService.uploadImages(new MultipartFile[]{file}).stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No upload result returned"));
    }

    // Download ảnh
    public InputStreamResource downloadImage(Long imageId) throws Exception {
        ImageEntity imageEntity = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));

        InputStream inputStream = minIOService.downloadFile(imageEntity.getStoragePath());
        return new InputStreamResource(inputStream);
    }

    // Xóa ảnh
    public void deleteImage(Long imageId) throws Exception {
        ImageEntity imageEntity = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));

        minIOService.deleteFile(imageEntity.getStoragePath());
        imageRepository.deleteById(imageId);

        log.info("Image deleted: {}", imageId);
    }

    // Lấy URL ảnh
    public String getImageUrl(Long imageId) throws Exception {
        ImageEntity imageEntity = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));

        return minIOService.getPresignedFileUrl(imageEntity.getStoragePath());
    }

    // Lấy URL presigned download
    public String getPresignedDownloadUrl(Long imageId, int expirationHours) throws Exception {
        ImageEntity imageEntity = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));

        int expirationSeconds = expirationHours * 3600;
        return minIOService.getPresignedDownloadUrl(imageEntity.getStoragePath(), expirationSeconds);
    }

    // Lấy tên file ảnh
    public String getImageFileName(Long imageId) throws Exception {
        ImageEntity imageEntity = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));

        return imageEntity.getOriginalFileName();
    }

    // Kiểm tra xem ảnh có tồn tại
    public boolean imageExists(Long imageId) {
        return imageRepository.existsById(imageId);
    }

    // Lấy metadata của ảnh
    public ImageEntity getImageMetadata(Long imageId) {
        return imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found with id: " + imageId));
    }
}
