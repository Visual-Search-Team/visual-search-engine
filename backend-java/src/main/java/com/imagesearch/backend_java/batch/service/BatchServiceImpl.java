package com.imagesearch.backend_java.batch.service;

import com.imagesearch.backend_java.batch.dto.request.BatchRequest;
import com.imagesearch.backend_java.batch.dto.response.BatchResponse;
import com.imagesearch.backend_java.batch.dto.response.BatchSummaryResponse;
import com.imagesearch.backend_java.batch.entity.BatchEntity;
import com.imagesearch.backend_java.batch.enums.BatchStatus;
import com.imagesearch.backend_java.batch.mapper.BatchMapper;
import com.imagesearch.backend_java.batch.repository.BatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BatchServiceImpl implements BatchService{

    private final BatchMapper batchMapper;
    private final BatchRepository batchRepository;

    @Override
    public BatchResponse createBatch(BatchRequest request) {
        BatchEntity batch = batchMapper.toEntity(request);
        batch.setStatus(BatchStatus.DRAFT);
        batchRepository.save(batch);
        return batchMapper.toResponse(batch);
    }

    @Override
    public BatchResponse getBatch(Long id) {
        BatchEntity batch = batchRepository.findById(id)
                .orElseThrow(() ->new RuntimeException("Batch not found"));
        return batchMapper.toResponse(batch);
    }

    @Override
    public BatchResponse updateBatch(Long id, BatchRequest request) {
        BatchEntity batch = batchRepository.findById(id)
                .orElseThrow(() ->new RuntimeException("Batch not found"));
        batchMapper.updateEntity(request, batch);
        batchRepository.save(batch);
        return batchMapper.toResponse(batch);
    }

    @Override
    public void deleteBatch(Long id) {
        BatchEntity batch = batchRepository.findById(id)
                .orElseThrow(() ->new RuntimeException("Batch not found"));
        if(!batch.getStatus().equals(BatchStatus.INDEXING)){
            batchRepository.delete(batch);
        }
        else{
            throw new RuntimeException("Batch is indexing");
        }
    }

    @Override
    public List<BatchSummaryResponse> getAllBatches() {
        return batchMapper.toListResponse(batchRepository.findAll());
    }
}
