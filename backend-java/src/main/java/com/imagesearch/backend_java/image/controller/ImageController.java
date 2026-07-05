package com.imagesearch.backend_java.image.controller;

import com.imagesearch.backend_java.image.dto.response.ImageUploadResponse;
import com.imagesearch.backend_java.image.dto.response.URLResponse;
import com.imagesearch.backend_java.image.service.ImageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/visual-search/v1/images")
@RequiredArgsConstructor
@Slf4j
public class ImageController {

    private final ImageService imageService;

    // Upload 1 ảnh
    @PostMapping("/upload")
    public ResponseEntity<ImageUploadResponse> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            ImageUploadResponse response = imageService.uploadImage(file);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error uploading image", e);
            return ResponseEntity.badRequest().build();
        }
    }

    // Download ảnh
    @GetMapping("/download/{imageId}")
    public ResponseEntity<Resource> downloadImage(@PathVariable Long imageId) {
        try {
            InputStreamResource resource = imageService.downloadImage(imageId);
            String originalFileName = imageService.getImageFileName(imageId);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + originalFileName + "\"")
                    .body(resource);
        } catch (Exception e) {
            log.error("Error downloading image", e);
            return ResponseEntity.notFound().build();
        }
    }

    // Lấy ảnh theo id
    @GetMapping("/{imageId}")
    public ResponseEntity<InputStreamResource> getImage(@PathVariable Long imageId) {
        try {
            InputStreamResource resource = imageService.downloadImage(imageId);
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG)
                    .body(resource);
        } catch (Exception e) {
            log.error("Error getting image", e);
            return ResponseEntity.notFound().build();
        }
    }

    // Xóa ảnh
    @DeleteMapping("/{imageId}")
    public ResponseEntity<Void> deleteImage(@PathVariable Long imageId) {
        try {
            imageService.deleteImage(imageId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting image", e);
            return ResponseEntity.notFound().build();
        }
    }

    // Lấy URL của ảnh
    @GetMapping("/{imageId}/url")
    public ResponseEntity<?> getImageUrl(@PathVariable Long imageId) {
        try {
            String url = imageService.getImageUrl(imageId);
            return ResponseEntity.ok(new URLResponse(url));
        } catch (Exception e) {
            log.error("Error getting image URL", e);
            return ResponseEntity.notFound().build();
        }
    }

    // Lấy URL presigned download
    @GetMapping("/{imageId}/presigned-download-url")
    public ResponseEntity<?> getPresignedDownloadUrl(
            @PathVariable Long imageId,
            @RequestParam(value = "expiration", defaultValue = "24") int expirationHours) {
        try {
            String url = imageService.getPresignedDownloadUrl(imageId, expirationHours);
            return ResponseEntity.ok(new URLResponse(url));
        } catch (Exception e) {
            log.error("Error getting presigned download URL", e);
            return ResponseEntity.notFound().build();
        }
    }

}
