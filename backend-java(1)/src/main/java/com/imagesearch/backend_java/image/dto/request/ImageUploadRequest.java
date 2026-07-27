package com.imagesearch.backend_java.image.dto.request;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ImageUploadRequest {
    private String originalFileName;
    private String mimeType;
    private Long fileSize;
}
