package com.imagesearch.backend_java.search.dto.response;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({"embedding", "filters", "negativeFilters", "negative_filters"})
public class EmbeddingResponse {
    private List<Float> embedding;
    private Map<String, List<String>> filters;
    
    @com.fasterxml.jackson.annotation.JsonProperty("negative_filters")
    private Map<String, List<String>> negativeFilters;
}
