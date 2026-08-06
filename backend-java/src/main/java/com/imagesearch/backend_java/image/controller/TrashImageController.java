package com.imagesearch.backend_java.image.controller;

import com.imagesearch.backend_java.auth.dto.BaseResponse;
import com.imagesearch.backend_java.image.dto.request.TrashImageBulkActionRequest;
import com.imagesearch.backend_java.image.dto.response.TrashImageBulkActionResponse;
import com.imagesearch.backend_java.image.dto.response.TrashImageItemResponse;
import com.imagesearch.backend_java.image.service.TrashImageService;
import com.imagesearch.backend_java.index.dto.PageResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/admin/trash-images")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
public class TrashImageController {

    private final TrashImageService trashImageService;

    @GetMapping
    public ResponseEntity<BaseResponse<PageResponse<TrashImageItemResponse>>> getTrashImages(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size
    ) {
        try {
            PageResponse<TrashImageItemResponse> response = trashImageService.getTrashImages(page, size);
            return ResponseEntity.ok(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error fetching trash images", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("TRASH_IMAGES_FETCH_ERROR", ex.getMessage()));
        }
    }

    @PostMapping("/{imageId}/restore")
    public ResponseEntity<BaseResponse<TrashImageItemResponse>> restoreImage(@PathVariable Long imageId) {
        try {
            TrashImageItemResponse response = trashImageService.restoreImage(imageId);
            return ResponseEntity.ok(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error restoring trash image {}", imageId, ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("TRASH_IMAGE_RESTORE_ERROR", ex.getMessage()));
        }
    }

    @PostMapping("/restore-batch")
    public ResponseEntity<BaseResponse<TrashImageBulkActionResponse>> restoreImages(
            @RequestBody TrashImageBulkActionRequest request
    ) {
        try {
            TrashImageBulkActionResponse response = trashImageService.restoreImages(request == null ? null : request.getImageIds());
            return ResponseEntity.ok(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error restoring selected trash images", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("TRASH_IMAGE_RESTORE_BATCH_ERROR", ex.getMessage()));
        }
    }

    @PostMapping("/restore-all")
    public ResponseEntity<BaseResponse<TrashImageBulkActionResponse>> restoreAllImages() {
        try {
            TrashImageBulkActionResponse response = trashImageService.restoreAllImages();
            return ResponseEntity.ok(BaseResponse.success(response));
        } catch (Exception ex) {
            log.error("Error restoring all trash images", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("TRASH_IMAGE_RESTORE_ALL_ERROR", ex.getMessage()));
        }
    }

    @DeleteMapping("/{imageId}/permanent")
    public ResponseEntity<BaseResponse<Void>> permanentlyDeleteImage(@PathVariable Long imageId) {
        try {
            trashImageService.permanentlyDeleteImage(imageId);
            return ResponseEntity.ok(BaseResponse.<Void>builder()
                    .success(true)
                    .timestamp(OffsetDateTime.now())
                    .build());
        } catch (Exception ex) {
            log.error("Error permanently deleting trash image {}", imageId, ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("TRASH_IMAGE_PERMANENT_DELETE_ERROR", ex.getMessage()));
        }
    }

    @PostMapping("/permanent-delete-batch")
    public ResponseEntity<BaseResponse<Map<String, Object>>> permanentlyDeleteImages(
            @RequestBody TrashImageBulkActionRequest request
    ) {
        try {
            int affectedCount = trashImageService.permanentlyDeleteImages(request == null ? null : request.getImageIds());
            return ResponseEntity.ok(BaseResponse.success(Map.of("affectedCount", affectedCount)));
        } catch (Exception ex) {
            log.error("Error permanently deleting selected trash images", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("TRASH_IMAGE_PERMANENT_DELETE_BATCH_ERROR", ex.getMessage()));
        }
    }

    @PostMapping("/permanent-delete-all")
    public ResponseEntity<BaseResponse<Map<String, Object>>> permanentlyDeleteAllImages() {
        try {
            int affectedCount = trashImageService.permanentlyDeleteAllImages();
            return ResponseEntity.ok(BaseResponse.success(Map.of("affectedCount", affectedCount)));
        } catch (Exception ex) {
            log.error("Error permanently deleting all trash images", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(BaseResponse.error("TRASH_IMAGE_PERMANENT_DELETE_ALL_ERROR", ex.getMessage()));
        }
    }

    @GetMapping("/policy")
    public ResponseEntity<BaseResponse<Map<String, Object>>> getTrashPolicy() {
        return ResponseEntity.ok(BaseResponse.success(Map.of(
                "retentionDays", trashImageService.getRetentionDays()
        )));
    }
}
