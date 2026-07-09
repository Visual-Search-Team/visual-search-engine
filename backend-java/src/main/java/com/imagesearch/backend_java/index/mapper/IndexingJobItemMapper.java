package com.imagesearch.backend_java.index.mapper;

import com.imagesearch.backend_java.index.dto.IndexingJobItemResponse;
import com.imagesearch.backend_java.index.entity.IndexingJobItemEntity;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface IndexingJobItemMapper {
    IndexingJobItemResponse toResponse(IndexingJobItemEntity entity);

    List<IndexingJobItemResponse> toListResponse(List<IndexingJobItemEntity> entities);

    IndexingJobItemEntity toEntity(IndexingJobItemResponse response);
}
