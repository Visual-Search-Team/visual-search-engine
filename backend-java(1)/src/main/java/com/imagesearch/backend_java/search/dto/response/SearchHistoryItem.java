package com.imagesearch.backend_java.search.dto.response;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({
        "id",
        "searchType",
        "queryText",
        "queryImageId",
        "queryImageUrl",
        "resultCount",
        "processingTimeMs",
        "createdAt"
})
public class SearchHistoryItem {
    private Long id;
    private String searchType;
    private String queryText;
    private Long queryImageId;
    private String queryImageUrl;
    private Integer resultCount;
    private Long processingTimeMs;
    private LocalDateTime createdAt;
}
