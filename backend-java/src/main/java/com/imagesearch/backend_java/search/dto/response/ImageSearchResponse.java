package com.imagesearch.backend_java.search.dto.response;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.imagesearch.backend_java.search.dto.PageResponseAbstract;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({
        "searchId",
        "searchType",
        "queryImageUrl",
        "processingTimeMs",
        "results",
        "page",
        "size",
        "totalElements",
        "totalPages",
        "first",
        "last"
})
public class ImageSearchResponse extends PageResponseAbstract {
    private Long searchId;
    private String searchType;
    private String queryImageUrl;
    private Long processingTimeMs;
    private List<SearchResultItem> results;
}
