package com.imagesearch.backend_java.batch.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class BatchRequest {
    @NotBlank(message = "Name cannot be blank")
    @Size(min = 1, max = 255)
    private String name;

    @Size(max = 1000)
    private String description;
}
