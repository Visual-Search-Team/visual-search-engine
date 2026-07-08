package com.imagesearch.backend_java.search.dto.response;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({"id", "imageId", "createdAt"})
public class CreateBookmarkResponse {
    private Long id;
    private Long imageId;
    private LocalDateTime createdAt;
}
