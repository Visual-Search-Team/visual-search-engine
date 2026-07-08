package com.imagesearch.backend_java.search.dto.request;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookmarkImageRequest {
    @Min(value = 1, message = "Image id must be greater than or equal to 1")
    private Long imageId;
}
