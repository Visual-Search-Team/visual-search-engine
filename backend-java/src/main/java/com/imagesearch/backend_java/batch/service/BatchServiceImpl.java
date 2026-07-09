package com.imagesearch.backend_java.batch.service;

import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import com.imagesearch.backend_java.batch.converter.BatchSearchConverter;
import com.imagesearch.backend_java.batch.dto.request.BatchRequest;
import com.imagesearch.backend_java.batch.dto.request.BatchSearch;
import com.imagesearch.backend_java.batch.dto.response.BatchResponse;
import com.imagesearch.backend_java.batch.dto.response.BatchSummaryResponse;
import com.imagesearch.backend_java.batch.dto.response.PageResponse;
import com.imagesearch.backend_java.batch.entity.BatchEntity;
import com.imagesearch.backend_java.batch.enums.BatchStatus;
import com.imagesearch.backend_java.batch.exception.BatchNotFoundException;
import com.imagesearch.backend_java.batch.exception.InvalidBatchStateException;
import com.imagesearch.backend_java.batch.mapper.BatchMapper;
import com.imagesearch.backend_java.batch.repository.BatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "BATCH-SERVICE")
public class BatchServiceImpl implements BatchService {

    private final BatchMapper batchMapper;
    private final BatchRepository batchRepository;
    private final BatchSearchConverter batchSearchConverter;
    private final UserRepository userRepository;

    @Transactional
    @Override
    public BatchResponse createBatch(BatchRequest request) {
        log.info("Creating batch with name: {}", request.getName());
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication != null ? authentication.getName() : null;
            
            if (username == null) {
                log.error("Cannot create batch: User not authenticated");
                throw new IllegalStateException("User is not authenticated");
            }

            User currentUser = userRepository.findByUsername(username)
                    .orElseThrow(() -> {
                        log.error("User not found: {}", username);
                        return new IllegalStateException("Current user not found: " + username);
                    });

            BatchEntity batch = batchMapper.toEntity(request);
            batch.setStatus(BatchStatus.DRAFT);
            batch.setTotalImages(0);
            batch.setIndexedImages(0);
            batch.setFailedImages(0);
            batch.setCreatedBy(currentUser);
            batchRepository.save(batch);
            log.info("Batch created successfully with id: {} by user: {}", batch.getId(), username);
            return batchMapper.toResponse(batch);
        } catch (Exception ex) {
            log.error("Error creating batch: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    @Override
    public BatchResponse getBatch(Long id) {
        log.info("Fetching batch with id: {}", id);
        try {
            BatchEntity batch = batchRepository.findById(id)
                    .orElseThrow(() -> {
                        log.warn("Batch not found with id: {}", id);
                        return new BatchNotFoundException("Batch not found with id: " + id);
                    });
            log.info("Batch fetched successfully with id: {}", id);
            return batchMapper.toResponse(batch);
        } catch (BatchNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error fetching batch: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Transactional
    @Override
    public BatchResponse updateBatch(Long id, BatchRequest request) {
        log.info("Updating batch with id: {}", id);
        try {
            BatchEntity batch = batchRepository.findById(id)
                    .orElseThrow(() -> {
                        log.warn("Batch not found with id: {}", id);
                        return new BatchNotFoundException("Batch not found with id: " + id);
                    });
            batchMapper.updateEntity(request, batch);
            batchRepository.save(batch);
            log.info("Batch updated successfully with id: {}", id);
            return batchMapper.toResponse(batch);
        } catch (BatchNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error updating batch: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Transactional
    @Override
    public void deleteBatch(Long id) {
        log.info("Deleting batch with id: {}", id);
        try {
            BatchEntity batch = batchRepository.findById(id)
                    .orElseThrow(() -> {
                        log.warn("Batch not found with id: {}", id);
                        return new BatchNotFoundException("Batch not found with id: " + id);
                    });

            if (batch.getStatus() == BatchStatus.INDEXING) {
                log.warn("Cannot delete batch in INDEXING state with id: {}", id);
                throw new InvalidBatchStateException("Cannot delete batch in INDEXING state. Current status: " + batch.getStatus());
            }

            batch.setStatus(BatchStatus.DELETED);
            batchRepository.save(batch);
            log.info("Batch deleted successfully with id: {}", id);
        } catch (BatchNotFoundException | InvalidBatchStateException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error deleting batch: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<BatchSummaryResponse> getBatches(Map<String, Object> params) {
        log.debug("Fetching batches with params: {}", params);
        try {
            BatchSearch batchSearch = batchSearchConverter.toBatchSearch(params);
            log.debug("Batch search criteria - page: {}, size: {}, name: {}, status: {}",
                    batchSearch.getPage(), batchSearch.getSize(), batchSearch.getName(), batchSearch.getStatus());

            List<BatchEntity> batchEntities = batchRepository.getBatches(batchSearch);
            long totalElements = batchRepository.countBatches(batchSearch);

            log.debug("Retrieved {} batches, total elements: {}", batchEntities.size(), totalElements);
            List<BatchSummaryResponse> responses = batchMapper.toListResponse(batchEntities);
            PageResponse<BatchSummaryResponse> pageResponse = PageResponse.of(
                    responses,
                    batchSearch.getPage(),
                    batchSearch.getSize(),
                    totalElements
            );
            log.info("Successfully fetched page {} with {} batches", batchSearch.getPage(), batchEntities.size());
            return pageResponse;
        } catch (Exception ex) {
            log.error("Error fetching batches: {}", ex.getMessage(), ex);
            throw ex;
        }
    }
}
