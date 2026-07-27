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
        "id",
        "searchType",
        "queryText",
        "queryImageUrl",
        "resultCount",
        "processingTimeMs",
        "createdAt",
        "results"
})
public class SearchHistoryDetailResponse extends SearchHistoryItem {
    private SearchHistoryResultPage results;
}
