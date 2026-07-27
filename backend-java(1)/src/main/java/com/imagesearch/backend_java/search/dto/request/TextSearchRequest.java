package com.imagesearch.backend_java.search.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
public class TextSearchRequest {
    @NotBlank(message = "Query is required")
    private String q;

    @NotBlank(message = "Mode is required")
    @Pattern(regexp = "semantic|ocr", message = "Mode must be semantic or ocr")
    private String mode;
}
