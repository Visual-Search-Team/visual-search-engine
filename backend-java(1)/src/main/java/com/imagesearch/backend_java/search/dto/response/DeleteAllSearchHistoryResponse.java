package com.imagesearch.backend_java.search.dto.response;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({"deletedCount"})
public class DeleteAllSearchHistoryResponse {
    private Long deletedCount;
}
