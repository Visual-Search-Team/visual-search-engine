package com.imagesearch.backend_java.search.dto.response;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({
        "bookmarkId",
        "imageId",
        "originalFilename",
        "imageUrl",
        "thumbnailUrl",
        "width",
        "height",
        "mimeType",
        "bookmarkedAt"
})
public class BookmarkItem {
    private Long bookmarkId;
    private Long imageId;
    private String originalFilename;
    private String imageUrl;
    private String thumbnailUrl;
    private Integer width;
    private Integer height;
    private String mimeType;
    private LocalDateTime bookmarkedAt;
}
