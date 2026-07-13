package com.imagesearch.backend_java.image.controller;

import com.imagesearch.backend_java.auth.dto.BaseResponse;
import com.imagesearch.backend_java.image.dto.response.ImageUploadResponse;
import com.imagesearch.backend_java.image.dto.response.URLResponse;
import com.imagesearch.backend_java.image.service.ImageService;
import com.imagesearch.backend_java.index.dto.UploadImageBatchResponse;
import com.imagesearch.backend_java.index.service.ImageUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/images")
@RequiredArgsConstructor
@Slf4j
public class ImageController {

    private final ImageService imageService;
    private final ImageUploadService imageUploadService;

    // Upload nhiều ảnh vào batch
    @PostMapping("/batches/{batchId}/upload")
    public ResponseEntity<BaseResponse<List<UploadImageBatchResponse>>> uploadImageBatch(
            @PathVariable Long batchId,
            @RequestParam(value = "files", required = false) MultipartFile[] files,
            @RequestParam(value = "file", required = false) MultipartFile singleFile) {
        log.info("POST /images/batches/{}/upload: Upload images", batchId);
        try {
            MultipartFile[] filesToUpload = files;
            
            // Handle single file sent as 'file' parameter
            if ((files == null || files.length == 0) && singleFile != null) {
                filesToUpload = new MultipartFile[]{singleFile};
            }
            
            // Handle case where no files provided
            if (filesToUpload == null || filesToUpload.length == 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(BaseResponse.error("NO_FILES_PROVIDED", "No files provided in request"));
            }

            log.info("Uploading {} files to batch: {}", filesToUpload.length, batchId);
            List<UploadImageBatchResponse> responses = imageUploadService.uploadImageBatch(batchId, filesToUpload);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(BaseResponse.success(responses));
        } catch (Exception ex) {
            log.error("Error uploading images to batch", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("IMAGE_UPLOAD_ERROR", ex.getMessage()));
        }
    }

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
