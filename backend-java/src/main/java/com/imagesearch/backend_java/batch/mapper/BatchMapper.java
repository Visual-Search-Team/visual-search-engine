package com.imagesearch.backend_java.batch.mapper;

import com.imagesearch.backend_java.batch.dto.request.BatchRequest;
import com.imagesearch.backend_java.batch.dto.response.BatchResponse;
import com.imagesearch.backend_java.batch.dto.response.BatchSummaryResponse;
import com.imagesearch.backend_java.batch.entity.BatchEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface BatchMapper {
    BatchEntity toEntity(BatchRequest request);
    BatchResponse toResponse(BatchEntity entity);
    List<BatchSummaryResponse> toListResponse(List<BatchEntity> batchEntities);
    void updateEntity(BatchRequest request,@MappingTarget BatchEntity entity);
}
