package com.imagesearch.backend_java.image.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrashImageItemResponse {
    private Long id;
    private Long restoredJobId;
    private String originalFileName;
    private String mimeType;
    private Long fileSize;
    private Integer width;
    private Integer height;
    private String imageUrl;
    private String thumbnailUrl;
    private LocalDateTime deletedAt;
    private LocalDateTime expiresAt;
    private Long daysUntilPermanentDeletion;
}
