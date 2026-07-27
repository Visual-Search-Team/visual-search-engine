package com.imagesearch.backend_java.index.service;

import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import com.imagesearch.backend_java.batch.dto.response.PageResponse;
import com.imagesearch.backend_java.batch.entity.BatchEntity;
import com.imagesearch.backend_java.batch.enums.BatchStatus;
import com.imagesearch.backend_java.batch.repository.BatchRepository;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.repository.ImageRepository;
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
import com.imagesearch.backend_java.index.enums.ImageIndexStatus;
import com.imagesearch.backend_java.index.repository.IndexingJobRepository;
import com.imagesearch.backend_java.batch.dto.PageableRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "INDEXING-JOB-SERVICE")
public class IndexingJobServiceImpl implements IndexingJobService {

    private final IndexingJobRepository indexingJobRepository;
    private final IndexingJobItemRepository indexingJobItemRepository;
    private final BatchRepository batchRepository;
    private final ImageRepository imageRepository;
    private final UserRepository userRepository;
    private final IndexingJobMapper indexingJobMapper;
    private final IndexingJobItemMapper indexingJobItemMapper;
    private final IndexingJobSearchConverter searchConverter;
    private final BackendAiIndexingClient backendAiIndexingClient;

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

    @Transactional
    @Override
    public IndexingJobResponse getIndexingJob(Long jobId) {
        log.info("Fetching indexing job: {}", jobId);
        try {
            IndexingJobEntity job = indexingJobRepository.findById(jobId)
                    .orElseThrow(() -> {
                        log.warn("Indexing job not found: {}", jobId);
                        return new IndexingJobNotFoundException("Indexing job not found: " + jobId);
                    });

            refreshJobProgress(job);

            log.info("Indexing job fetched successfully: {}", jobId);
            return indexingJobMapper.toResponse(job);
        } catch (IndexingJobNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error fetching indexing job: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Transactional
    @Override
    public PageResponse<IndexingJobSummaryResponse> getIndexingJobsByBatch(Long batchId, Map<String, Object> params) {
        log.debug("Fetching indexing jobs for batch: {} with params: {}", batchId, params);
        try {
            PageableRequest pageRequest = searchConverter.toPageableRequest(params);
            Integer offset = pageRequest.getPage() * pageRequest.getSize();

            List<IndexingJobEntity> jobs = indexingJobRepository.findByBatchIdPaged(
                    batchId, offset, pageRequest.getSize());
            Long total = indexingJobRepository.countByBatchId(batchId);

                jobs.forEach(this::refreshJobProgress);

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

            upsertJobItemsFromBatchImages(job);

            job.setStatus(JobStatus.RUNNING);
            job.setStartedAt(java.time.LocalDateTime.now());
            indexingJobRepository.save(job);

            try {
                Long batchId = job.getBatch() != null ? job.getBatch().getId() : null;
                backendAiIndexingClient.triggerIndexing(batchId);
                refreshJobProgress(job);
            } catch (Exception ex) {
                job.setStatus(JobStatus.FAILED);
                job.setFinishedAt(java.time.LocalDateTime.now());
                job.setErrorMessage("Could not trigger backend-ai indexing: " + ex.getMessage());
                indexingJobRepository.save(job);
                throw new InvalidBatchForIndexingException("Could not trigger backend-ai indexing: " + ex.getMessage());
            }

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

    @Transactional
    @Override
    public IndexingJobResponse retryIndexing(Long jobId) {
        log.info("Retrying failed items for indexing job: {}", jobId);
        try {
            IndexingJobEntity job = indexingJobRepository.findById(jobId)
                    .orElseThrow(() -> {
                        log.warn("Indexing job not found: {}", jobId);
                        return new IndexingJobNotFoundException("Indexing job not found: " + jobId);
                    });

            if (job.getStatus() == JobStatus.RUNNING) {
                log.warn("Cannot retry indexing job while it is RUNNING: {}", jobId);
                throw new InvalidBatchForIndexingException("Cannot retry indexing job while it is RUNNING");
            }

            List<IndexingJobItemEntity> failedItems = indexingJobItemRepository.findByIndexingJobIdAndStatus(jobId, ImageIndexStatus.FAILED);
            for (IndexingJobItemEntity item : failedItems) {
                item.setStatus(ImageIndexStatus.PENDING);
                item.setRetryCount((item.getRetryCount() == null ? 0 : item.getRetryCount()) + 1);
                item.setErrorMessage(null);
                item.setProcessedAt(null);
            }
            if (!failedItems.isEmpty()) {
                indexingJobItemRepository.saveAll(failedItems);
            }

            job.setStatus(JobStatus.PENDING);
            job.setFinishedAt(null);
            job.setErrorMessage(null);
            job.setFailedCount(0);
            job.setSuccessCount(0);
            indexingJobRepository.save(job);

            log.info("Retry scheduled for {} items in job {}", failedItems.size(), jobId);
            return indexingJobMapper.toResponse(job);
        } catch (IndexingJobNotFoundException | InvalidBatchForIndexingException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Error retrying indexing job: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Transactional
    @Override
    public java.util.Map<String, Long> getStats() {
        log.debug("Gathering indexing stats");
        try {
            List<IndexingJobEntity> allJobs = indexingJobRepository.findAll();
            allJobs.forEach(this::refreshJobProgress);

            long total = allJobs.size();
            long pending = allJobs.stream().filter(job -> job.getStatus() == JobStatus.PENDING).count();
            long running = allJobs.stream().filter(job -> job.getStatus() == JobStatus.RUNNING).count();
            long completed = allJobs.stream().filter(job -> job.getStatus() == JobStatus.COMPLETED).count();
            long failed = allJobs.stream().filter(job -> job.getStatus() == JobStatus.FAILED).count();

            java.util.Map<String, Long> stats = new java.util.HashMap<>();
            stats.put("totalJobs", total);
            stats.put("pendingJobs", pending);
            stats.put("runningJobs", running);
            stats.put("completedJobs", completed);
            stats.put("failedJobs", failed);
            return stats;
        } catch (Exception ex) {
            log.error("Error gathering stats: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    @Scheduled(initialDelay = 5000, fixedDelay = 15000)
    @Transactional
    public void reconcileRunningJobs() {
        List<IndexingJobEntity> runningJobs = indexingJobRepository.findByStatus(JobStatus.RUNNING);
        if (runningJobs.isEmpty()) {
            return;
        }

        log.debug("Reconciling {} running indexing jobs", runningJobs.size());
        runningJobs.forEach(this::refreshJobProgress);
    }

    private void refreshJobProgress(IndexingJobEntity job) {
        if (job == null || job.getBatch() == null || job.getBatch().getId() == null) {
            return;
        }

        upsertJobItemsFromBatchImages(job);
        syncJobItemStatuses(job.getId());

        Long batchId = job.getBatch().getId();
        int totalImages = imageRepository.countByBatchId(batchId).intValue();
        int indexedImages = imageRepository.countByBatchIdAndIndexStatus(
                batchId,
                com.imagesearch.backend_java.image.enums.ImageIndexStatus.INDEXED
        ).intValue();
        int failedImages = imageRepository.countByBatchIdAndIndexStatus(
                batchId,
                com.imagesearch.backend_java.image.enums.ImageIndexStatus.FAILED
        ).intValue();
        int pendingImages = imageRepository.countByBatchIdAndIndexStatus(
                batchId,
                com.imagesearch.backend_java.image.enums.ImageIndexStatus.PENDING
        ).intValue();
        int processingImages = imageRepository.countByBatchIdAndIndexStatus(
                batchId,
                com.imagesearch.backend_java.image.enums.ImageIndexStatus.PROCESSING
        ).intValue();

        job.setTotalImages(totalImages);
        job.setSuccessCount(indexedImages);
        job.setFailedCount(failedImages);

        int completedImages = indexedImages + failedImages;
        boolean hasWorkInProgress = (pendingImages + processingImages) > 0;

        if (totalImages > 0 && completedImages >= totalImages) {
            if (failedImages == 0) {
                job.setStatus(JobStatus.COMPLETED);
            } else if (indexedImages == 0) {
                job.setStatus(JobStatus.FAILED);
            } else {
                job.setStatus(JobStatus.PARTIALLY_FAILED);
            }

            if (job.getFinishedAt() == null) {
                job.setFinishedAt(LocalDateTime.now());
            }
        } else if (hasWorkInProgress && (job.getStatus() == JobStatus.RUNNING || job.getStatus() == JobStatus.PENDING)) {
            job.setStatus(JobStatus.RUNNING);
            job.setFinishedAt(null);
        }

        BatchEntity batch = job.getBatch();
        batch.setTotalImages(totalImages);
        batch.setIndexedImages(indexedImages);
        batch.setFailedImages(failedImages);

        if (totalImages > 0 && completedImages >= totalImages) {
            batch.setStatus(failedImages > 0 ? BatchStatus.FAILED : BatchStatus.INDEXED);
        } else if (hasWorkInProgress) {
            batch.setStatus(BatchStatus.INDEXING);
        }

        batchRepository.save(batch);
        indexingJobRepository.save(job);
    }

    private void upsertJobItemsFromBatchImages(IndexingJobEntity job) {
        if (job == null || job.getId() == null || job.getBatch() == null || job.getBatch().getId() == null) {
            return;
        }

        List<ImageEntity> batchImages = imageRepository.findByBatchId(job.getBatch().getId());
        if (batchImages.isEmpty()) {
            return;
        }

        List<IndexingJobItemEntity> existingItems = indexingJobItemRepository.findByIndexingJobId(job.getId());
        Set<Long> existingImageIds = new HashSet<>();
        for (IndexingJobItemEntity item : existingItems) {
            if (item.getImage() != null && item.getImage().getId() != null) {
                existingImageIds.add(item.getImage().getId());
            }
        }

        List<IndexingJobItemEntity> newItems = batchImages.stream()
                .filter(image -> image.getId() != null && !existingImageIds.contains(image.getId()))
                .map(image -> IndexingJobItemEntity.builder()
                        .indexingJob(job)
                        .image(image)
                        .status(mapImageStatus(image.getIndexStatus()))
                        .retryCount(0)
                        .errorMessage(null)
                        .build())
                .toList();

        if (!newItems.isEmpty()) {
            indexingJobItemRepository.saveAll(newItems);
        }
    }

    private void syncJobItemStatuses(Long jobId) {
        if (jobId == null) {
            return;
        }

        List<IndexingJobItemEntity> items = indexingJobItemRepository.findByIndexingJobId(jobId);
        if (items.isEmpty()) {
            return;
        }

        boolean changed = false;
        for (IndexingJobItemEntity item : items) {
            if (item.getImage() == null) {
                continue;
            }

            ImageIndexStatus mappedStatus = mapImageStatus(item.getImage().getIndexStatus());
            if (mappedStatus != item.getStatus()) {
                item.setStatus(mappedStatus);
                if (mappedStatus == ImageIndexStatus.INDEXED || mappedStatus == ImageIndexStatus.FAILED) {
                    item.setProcessedAt(LocalDateTime.now());
                }
                changed = true;
            }
        }

        if (changed) {
            indexingJobItemRepository.saveAll(items);
        }
    }

    private ImageIndexStatus mapImageStatus(com.imagesearch.backend_java.image.enums.ImageIndexStatus status) {
        if (status == null) {
            return ImageIndexStatus.PENDING;
        }

        return ImageIndexStatus.valueOf(status.name());
    }
}
