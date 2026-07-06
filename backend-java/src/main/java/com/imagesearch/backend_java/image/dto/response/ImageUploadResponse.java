package com.imagesearch.backend_java.image.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ImageUploadResponse {
    @JsonProperty("image_id")
    private Long imageId;

    @JsonProperty("storage_path")
    private String storagePath;

    @JsonProperty("file_url")
    private String fileUrl;

    @JsonProperty("original_filename")
    private String originalFileName;

    @JsonProperty("file_size")
    private Long fileSize;

    @JsonProperty("mime_type")
    private String mimeType;
}
