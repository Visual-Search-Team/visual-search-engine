package com.imagesearch.backend_java.index.service;

import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import com.imagesearch.backend_java.batch.dto.response.PageResponse;
import com.imagesearch.backend_java.batch.entity.BatchEntity;
import com.imagesearch.backend_java.batch.repository.BatchRepository;
import com.imagesearch.backend_java.index.converter.IndexingJobSearchConverter;
import com.imagesearch.backend_java.index.dto.IndexingJobItemResponse;
import com.imagesearch.backend_java.index.dto.request.IndexingJobRequest;
import com.imagesearch.backend_java.index.dto.IndexingJobResponse;
import com.imagesearch.backend_java.index.dto.IndexingJobSummaryResponse;
import com.imagesearch.backend_java.index.entity.IndexingJobEntity;
import com.imagesearch.backend_java.index.entity.IndexingJobItemEntity;
import com.imagesearch.backend_java.index.enums.JobStatus;
import com.imagesearch.backend_java.index.exception.IndexingJobNotFoundException;
import com.imagesearch.backend_java.index.exception.InvalidBatchForIndexingException;
import com.imagesearch.backend_java.index.mapper.IndexingJobItemMapper;
import com.imagesearch.backend_java.index.mapper.IndexingJobMapper;
import com.imagesearch.backend_java.index.repository.IndexingJobItemRepository;
import com.imagesearch.backend_java.index.repository.IndexingJobRepository;
import com.imagesearch.backend_java.batch.dto.PageableRequest;
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
@Slf4j(topic = "INDEXING-JOB-SERVICE")
public class IndexingJobServiceImpl implements IndexingJobService {

    private final IndexingJobRepository indexingJobRepository;
    private final IndexingJobItemRepository indexingJobItemRepository;
    private final BatchRepository batchRepository;
    private final UserRepository userRepository;
    private final IndexingJobMapper indexingJobMapper;
    private final IndexingJobItemMapper indexingJobItemMapper;
    private final IndexingJobSearchConverter searchConverter;

    @Transactional
    @Override
    public IndexingJobResponse createIndexingJob(IndexingJobRequest request) {
        log.info("Creating indexing job for batch: {}", request.getBatchId());
        try {
            BatchEntity batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> {
                        log.warn("Batch not found: {}", request.getBatchId());
                        return new InvalidBatchForIndexingException("Batch not found: " + request.getBatchId());
                    });

            Long existingJobCount = indexingJobRepository.countByBatchIdAndStatus(
                    request.getBatchId(), JobStatus.RUNNING);
            if (existingJobCount > 0) {
                log.warn("Indexing job already running for batch: {}", request.getBatchId());
                throw new InvalidBatchForIndexingException("Indexing job already running for batch: " + request.getBatchId());
            }

            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication != null ? authentication.getName() : null;

            User triggeredBy = null;
            if (username != null) {
                triggeredBy = userRepository.findByUsername(username).orElse(null);
            }

            IndexingJobEntity job = IndexingJobEntity.builder()
                    .batch(batch)
                    .triggeredBy(triggeredBy)
                    .status(JobStatus.PENDING)
                    .totalImages(batch.getTotalImages())
                    .successCount(0)
                    .failedCount(0)
                    .build();

            indexingJobRepository.save(job);
            log.info("Indexing job created successfully with id: {}", job.getId());
            return indexingJobMapper.toResponse(job);
        } catch (InvalidBatchForIndexingException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error creating indexing job: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    @Override
    public IndexingJobResponse getIndexingJob(Long jobId) {
        log.info("Fetching indexing job: {}", jobId);
        try {
            IndexingJobEntity job = indexingJobRepository.findById(jobId)
                    .orElseThrow(() -> {
                        log.warn("Indexing job not found: {}", jobId);
                        return new IndexingJobNotFoundException("Indexing job not found: " + jobId);
                    });

            log.info("Indexing job fetched successfully: {}", jobId);
            return indexingJobMapper.toResponse(job);
        } catch (IndexingJobNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error fetching indexing job: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<IndexingJobSummaryResponse> getIndexingJobsByBatch(Long batchId, Map<String, Object> params) {
        log.debug("Fetching indexing jobs for batch: {} with params: {}", batchId, params);
        try {
            PageableRequest pageRequest = searchConverter.toPageableRequest(params);
            Integer offset = pageRequest.getPage() * pageRequest.getSize();

            List<IndexingJobEntity> jobs = indexingJobRepository.findByBatchIdPaged(
                    batchId, offset, pageRequest.getSize());
            Long total = indexingJobRepository.countByBatchId(batchId);

            List<IndexingJobSummaryResponse> responses = indexingJobMapper.toListResponse(jobs);
            PageResponse<IndexingJobSummaryResponse> pageResponse = PageResponse.of(
                    responses,
                    pageRequest.getPage(),
                    pageRequest.getSize(),
                    total
            );

            log.info("Successfully fetched {} indexing jobs for batch: {}", jobs.size(), batchId);
            return pageResponse;
        } catch (Exception ex) {
            log.error("Error fetching indexing jobs: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Transactional
    @Override
    public IndexingJobResponse startIndexing(Long jobId) {
        log.info("Starting indexing job: {}", jobId);
        try {
            IndexingJobEntity job = indexingJobRepository.findById(jobId)
                    .orElseThrow(() -> {
                        log.warn("Indexing job not found: {}", jobId);
                        return new IndexingJobNotFoundException("Indexing job not found: " + jobId);
                    });

            if (job.getStatus() != JobStatus.PENDING) {
                log.warn("Cannot start indexing job with status: {}", job.getStatus());
                throw new InvalidBatchForIndexingException("Indexing job is not in PENDING status");
            }

            job.setStatus(JobStatus.RUNNING);
            job.setStartedAt(java.time.LocalDateTime.now());
            indexingJobRepository.save(job);

            log.info("Indexing job started successfully: {}", jobId);
            return indexingJobMapper.toResponse(job);
        } catch (InvalidBatchForIndexingException | IndexingJobNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error starting indexing job: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Transactional
    @Override
    public void cancelIndexing(Long jobId) {
        log.info("Cancelling indexing job: {}", jobId);
        try {
            IndexingJobEntity job = indexingJobRepository.findById(jobId)
                    .orElseThrow(() -> {
                        log.warn("Indexing job not found: {}", jobId);
                        return new IndexingJobNotFoundException("Indexing job not found: " + jobId);
                    });

            if (job.getStatus() == JobStatus.COMPLETED || job.getStatus() == JobStatus.FAILED) {
                log.warn("Cannot cancel indexing job with status: {}", job.getStatus());
                throw new InvalidBatchForIndexingException("Cannot cancel indexing job with status: " + job.getStatus());
            }

            job.setStatus(JobStatus.FAILED);
            job.setFinishedAt(java.time.LocalDateTime.now());
            job.setErrorMessage("Indexing job cancelled by user");
            indexingJobRepository.save(job);

            log.info("Indexing job cancelled successfully: {}", jobId);
        } catch (InvalidBatchForIndexingException | IndexingJobNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error cancelling indexing job: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<IndexingJobItemResponse> getJobItems(Long jobId, Map<String, Object> params) {
        log.debug("Fetching items for job: {} with params: {}", jobId, params);
        try {
            IndexingJobEntity job = indexingJobRepository.findById(jobId)
                    .orElseThrow(() -> {
                        log.warn("Indexing job not found: {}", jobId);
                        return new IndexingJobNotFoundException("Indexing job not found: " + jobId);
                    });

            PageableRequest pageRequest = searchConverter.toPageableRequest(params);
            Integer offset = pageRequest.getPage() * pageRequest.getSize();

            List<IndexingJobItemEntity> items = indexingJobItemRepository.findByJobIdPaged(
                    jobId, offset, pageRequest.getSize());
            Long total = indexingJobItemRepository.countByJobId(jobId);

            List<IndexingJobItemResponse> responses = indexingJobItemMapper.toListResponse(items);
            PageResponse<IndexingJobItemResponse> pageResponse = PageResponse.of(
                    responses,
                    pageRequest.getPage(),
                    pageRequest.getSize(),
                    total
            );

            log.info("Successfully fetched {} items for job: {}", items.size(), jobId);
            return pageResponse;
        } catch (Exception ex) {
            log.error("Error fetching job items: {}", ex.getMessage(), ex);
            throw ex;
        }
    }
}
