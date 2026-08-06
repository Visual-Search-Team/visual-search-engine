package com.imagesearch.backend_java.index.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IndexingJobDeleteImagesRequest {
    private List<Long> imageIds;
}
