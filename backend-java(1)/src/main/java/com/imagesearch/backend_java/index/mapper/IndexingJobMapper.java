package com.imagesearch.backend_java.index.mapper;

import com.imagesearch.backend_java.index.dto.IndexingJobResponse;
import com.imagesearch.backend_java.index.dto.IndexingJobSummaryResponse;
import com.imagesearch.backend_java.index.entity.IndexingJobEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface IndexingJobMapper {
    @Mapping(target = "batchId", source = "batch.id")
    IndexingJobResponse toResponse(IndexingJobEntity entity);

    IndexingJobSummaryResponse toSummaryResponse(IndexingJobEntity entity);

    List<IndexingJobSummaryResponse> toListResponse(List<IndexingJobEntity> entities);

    IndexingJobEntity toEntity(IndexingJobResponse response);
}
