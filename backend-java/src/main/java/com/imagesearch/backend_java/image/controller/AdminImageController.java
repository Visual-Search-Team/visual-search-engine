package com.imagesearch.backend_java.image.controller;

import com.imagesearch.backend_java.auth.dto.BaseResponse;
import com.imagesearch.backend_java.image.dto.request.AdminImageBulkDeleteRequest;
import com.imagesearch.backend_java.image.service.ImageService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/images")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
public class AdminImageController {

    private final ImageService imageService;

    @DeleteMapping("/{imageId}")
    public ResponseEntity<BaseResponse<Map<String, Object>>> deleteImage(@PathVariable Long imageId) {
        try {
            imageService.deleteImage(imageId);
            return ResponseEntity.ok(BaseResponse.success(Map.of(
                    "imageId", imageId,
                    "deleted", true
            )));
        } catch (Exception ex) {
            log.error("Error deleting image {}", imageId, ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("ADMIN_IMAGE_DELETE_ERROR", ex.getMessage()));
        }
    }

    @DeleteMapping
    public ResponseEntity<BaseResponse<Map<String, Object>>> deleteImages(
            @RequestBody(required = false) AdminImageBulkDeleteRequest request
    ) {
        try {
            List<Long> imageIds = request == null ? null : request.getImageIds();
            int deletedCount = imageService.deleteImagesByAdmin(imageIds);
            return ResponseEntity.ok(BaseResponse.success(Map.of(
                    "deletedCount", deletedCount
            )));
        } catch (Exception ex) {
            log.error("Error deleting selected images", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("ADMIN_IMAGE_BULK_DELETE_ERROR", ex.getMessage()));
        }
    }
}
