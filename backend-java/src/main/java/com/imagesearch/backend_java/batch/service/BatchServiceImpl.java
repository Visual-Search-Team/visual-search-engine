package com.imagesearch.backend_java.batch.service;

import com.imagesearch.backend_java.batch.converter.BatchSearchConverter;
import com.imagesearch.backend_java.batch.dto.request.BatchRequest;
import com.imagesearch.backend_java.batch.dto.request.BatchSearch;
import com.imagesearch.backend_java.batch.dto.response.BatchResponse;
import com.imagesearch.backend_java.batch.dto.response.BatchSummaryResponse;
import com.imagesearch.backend_java.batch.entity.BatchEntity;
import com.imagesearch.backend_java.batch.enums.BatchStatus;
import com.imagesearch.backend_java.batch.exception.BatchNotFoundException;
import com.imagesearch.backend_java.batch.mapper.BatchMapper;
import com.imagesearch.backend_java.batch.repository.BatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BatchServiceImpl implements BatchService{

    private final BatchMapper batchMapper;
    private final BatchRepository batchRepository;
    private final BatchSearchConverter batchSearchConverter;

    @Transactional
    @Override
    public BatchResponse createBatch(BatchRequest request) {
        BatchEntity batch = batchMapper.toEntity(request);
        batch.setStatus(BatchStatus.DRAFT);
        batchRepository.save(batch);
        return batchMapper.toResponse(batch);
    }

    @Transactional
    @Override
    public BatchResponse getBatch(Long id) {
        BatchEntity batch = batchRepository.findById(id)
                .orElseThrow(() ->new BatchNotFoundException("Batch not found"));
        return batchMapper.toResponse(batch);
    }
    @Transactional
    @Override
    public BatchResponse updateBatch(Long id, BatchRequest request) {
        BatchEntity batch = batchRepository.findById(id)
                .orElseThrow(() ->new BatchNotFoundException("Batch not found"));
        batchMapper.updateEntity(request, batch);

        batchRepository.save(batch);
        return batchMapper.toResponse(batch);
    }
    @Transactional
    @Override
    public void deleteBatch(Long id) {
        BatchEntity batch = batchRepository.findById(id)
                .orElseThrow(() ->new BatchNotFoundException("Batch not found"));
        if(!batch.getStatus().equals(BatchStatus.INDEXING)){
            batch.setStatus(BatchStatus.DELETED);
            batchRepository.save(batch);
        }
        else{
            throw new RuntimeException("Batch is indexing");
        }
    }
    @Transactional
    @Override
    public List<BatchSummaryResponse> getBatches(Map<String, Object> params) {
        BatchSearch batchSearch = batchSearchConverter.toBatchSearch(params);
        return batchMapper.toListResponse(batchRepository.getBatches(batchSearch));
    }
}
