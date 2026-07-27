package com.imagesearch.backend_java.image.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ImageUploadResponse {
    private Long imageId;
    private String storagePath;
    private String fileUrl;
    private String originalFileName;
    private Long fileSize;
    private String mimeType;
    private String thumbnailPath;
    private String thumbnailUrl;
    private Integer width;
    private Integer height;
}
