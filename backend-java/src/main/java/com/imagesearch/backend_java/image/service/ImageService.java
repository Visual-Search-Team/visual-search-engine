package com.imagesearch.backend_java.image.service;

import com.imagesearch.backend_java.image.dto.response.ImageUploadResponse;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.enums.ImageIndexStatus;
import com.imagesearch.backend_java.image.repository.ImageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageService {

    private final MinIOService minIOService;
    private final ImageRepository imageRepository;

    // Upload ảnh
    public ImageUploadResponse uploadImage(MultipartFile file) throws Exception {
        String storagePath = minIOService.uploadFile(file);
        String fileUrl = minIOService.getFileUrl(storagePath);

        ImageEntity imageEntity = ImageEntity.builder()
                .originalFileName(file.getOriginalFilename())
                .storagePath(storagePath)
                .mimeType(file.getContentType())
                .fileSize(file.getSize())
                .indexStatus(ImageIndexStatus.PENDING)
                .createAt(LocalDateTime.now())
                .build();

        ImageEntity savedImage = imageRepository.save(imageEntity);

        return ImageUploadResponse.builder()
                .imageId(savedImage.getId())
                .storagePath(storagePath)
                .fileUrl(fileUrl)
                .originalFileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .mimeType(file.getContentType())
                .build();
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

        return minIOService.getFileUrl(imageEntity.getStoragePath());
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
