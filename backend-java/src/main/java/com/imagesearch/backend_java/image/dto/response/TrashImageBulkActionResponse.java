package com.imagesearch.backend_java.image.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrashImageBulkActionResponse {
    private Integer affectedCount;
    private List<Long> restoredJobIds;
}