package com.imagesearch.backend_java.search.dto.response;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({
        "imageId",
        "originalFilename",
        "imageUrl",
        "thumbnailUrl",
        "similarityScore",
        "rankPosition"
})
public class SearchHistoryResultItem {
    private Long imageId;
    private String originalFilename;
    private String imageUrl;
    private String thumbnailUrl;
    private Float similarityScore;
    private Integer rankPosition;
}
