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
        "searchId",
        "searchType",
        "queryText",
        "mode",
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
public class TextSearchResponse extends ImageSearchResponse {
    private String queryText;
    private String mode;
}
