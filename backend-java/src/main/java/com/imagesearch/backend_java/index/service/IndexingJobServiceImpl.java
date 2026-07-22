package com.imagesearch.backend_java.index.service;

import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.enums.ImageIndexStatus;
import com.imagesearch.backend_java.image.repository.ImageRepository;
import com.imagesearch.backend_java.image.service.ImageIndexingService;
import com.imagesearch.backend_java.index.dto.IndexingJobItemResponse;
import com.imagesearch.backend_java.index.dto.IndexingJobResponse;
import com.imagesearch.backend_java.index.dto.IndexingJobSummaryResponse;
import com.imagesearch.backend_java.index.dto.PageResponse;
import com.imagesearch.backend_java.index.dto.request.IndexingJobRequest;
import com.imagesearch.backend_java.index.entity.IndexingJobEntity;
import com.imagesearch.backend_java.index.entity.IndexingJobItemEntity;
import com.imagesearch.backend_java.index.enums.JobStatus;
import com.imagesearch.backend_java.index.exception.IndexingJobNotFoundException;
import com.imagesearch.backend_java.index.exception.InvalidIndexingJobStateException;
import com.imagesearch.backend_java.index.repository.IndexingJobItemRepository;
import com.imagesearch.backend_java.index.repository.IndexingJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "INDEXING-JOB-SERVICE")
public class IndexingJobServiceImpl implements IndexingJobService {

    private final IndexingJobRepository indexingJobRepository;
    private final IndexingJobItemRepository indexingJobItemRepository;
    private final ImageRepository imageRepository;
    private final UserRepository userRepository;
    private final ImageIndexingService imageIndexingService;

    @Value("${app.indexing.processing-timeout-minutes:15}")
    private long processingTimeoutMinutes;

    @Transactional
    @Override
    public IndexingJobResponse trackUploadedImages(List<ImageEntity> images) {
        List<ImageEntity> validImages = images == null ? List.of() : images.stream()
                .filter(image -> image != null && image.getId() != null)
                .toList();

        if (validImages.isEmpty()) {
            throw new InvalidIndexingJobStateException("No uploaded images available to track");
        }

        IndexingJobEntity job = createJob(validImages, JobStatus.RUNNING, true);
        refreshJobProgress(job);
        return toResponse(job);
    }

    @Transactional
    @Override
    public IndexingJobResponse createIndexingJob(IndexingJobRequest request) {
        List<ImageEntity> images = resolveImagesForJob(request);
        if (images.isEmpty()) {
            throw new InvalidIndexingJobStateException("No images available for indexing job");
        }

        boolean startImmediately = request == null || request.getStartImmediately() == null || request.getStartImmediately();
        IndexingJobEntity job = createJob(images, startImmediately ? JobStatus.RUNNING : JobStatus.PENDING, startImmediately);

        if (startImmediately) {
            scheduleAsyncIndexing(images);
        }

        refreshJobProgress(job);
        return toResponse(job);
    }

    @Transactional
    @Override
    public IndexingJobResponse getIndexingJob(Long jobId) {
        IndexingJobEntity job = requireJob(jobId);
        refreshJobProgress(job);
        return toResponse(job);
    }

    @Transactional
    @Override
    public PageResponse<IndexingJobSummaryResponse> getIndexingJobs(Map<String, Object> params) {
        int page = getInt(params, "page", 0);
        int size = getInt(params, "size", 10);

        Page<IndexingJobEntity> jobPage = indexingJobRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        jobPage.getContent().forEach(this::refreshJobProgress);

        List<IndexingJobSummaryResponse> content = jobPage.getContent().stream()
                .map(this::toSummaryResponse)
                .toList();

        return PageResponse.of(content, page, size, jobPage.getTotalElements());
    }

    @Transactional
    @Override
    public IndexingJobResponse startIndexing(Long jobId) {
        IndexingJobEntity job = requireJob(jobId);
        if (job.getStatus() == JobStatus.RUNNING) {
            throw new InvalidIndexingJobStateException("Indexing job is already running");
        }

        List<ImageEntity> images = jobImages(job);
        if (images.isEmpty()) {
            throw new InvalidIndexingJobStateException("Indexing job has no images to process");
        }

        job.setStatus(JobStatus.RUNNING);
        if (job.getStartedAt() == null) {
            job.setStartedAt(LocalDateTime.now());
        }
        job.setFinishedAt(null);
        job.setErrorMessage(null);
        indexingJobRepository.save(job);

        scheduleAsyncIndexing(images);
        refreshJobProgress(job);
        return toResponse(job);
    }

    @Transactional
    @Override
    public void cancelIndexing(Long jobId) {
        IndexingJobEntity job = requireJob(jobId);
        if (job.getStatus() == JobStatus.RUNNING) {
            throw new InvalidIndexingJobStateException("Running indexing jobs cannot be cancelled because processing is already in flight");
        }
        if (isTerminal(job.getStatus())) {
            throw new InvalidIndexingJobStateException("Indexing job is already finished");
        }

        job.setStatus(JobStatus.FAILED);
        job.setFinishedAt(LocalDateTime.now());
        job.setErrorMessage("Indexing job cancelled by user");
        indexingJobRepository.save(job);
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<IndexingJobItemResponse> getJobItems(Long jobId, Map<String, Object> params) {
        requireJob(jobId);

        int page = getInt(params, "page", 0);
        int size = getInt(params, "size", 10);
        Page<IndexingJobItemEntity> itemPage = indexingJobItemRepository.findByIndexingJobId(jobId, PageRequest.of(page, size));
        List<IndexingJobItemResponse> content = itemPage.getContent().stream()
                .map(this::toItemResponse)
                .toList();

        return PageResponse.of(content, page, size, itemPage.getTotalElements());
    }

    @Transactional
    @Override
    public IndexingJobResponse retryIndexing(Long jobId) {
        IndexingJobEntity job = requireJob(jobId);
        List<IndexingJobItemEntity> failedItems = indexingJobItemRepository.findByIndexingJobIdAndStatus(jobId, ImageIndexStatus.FAILED);
        if (failedItems.isEmpty()) {
            refreshJobProgress(job);
            return toResponse(job);
        }

        List<ImageEntity> retryImages = new ArrayList<>();
        for (IndexingJobItemEntity item : failedItems) {
            ImageEntity image = item.getImage();
            if (image != null) {
                image.setIndexStatus(ImageIndexStatus.PENDING);
                image.setErrorMessage(null);
                image.setIndexedAt(null);
                imageRepository.save(image);
                retryImages.add(image);
            }

            item.setStatus(ImageIndexStatus.PENDING);
            item.setRetryCount((item.getRetryCount() == null ? 0 : item.getRetryCount()) + 1);
            item.setErrorMessage(null);
            item.setProcessedAt(null);
        }
        indexingJobItemRepository.saveAll(failedItems);

        job.setStatus(JobStatus.RUNNING);
        if (job.getStartedAt() == null) {
            job.setStartedAt(LocalDateTime.now());
        }
        job.setFinishedAt(null);
        job.setErrorMessage(null);
        indexingJobRepository.save(job);

        scheduleAsyncIndexing(retryImages);
        refreshJobProgress(job);
        return toResponse(job);
    }

    @Scheduled(initialDelay = 5000, fixedDelay = 15000)
    @Transactional
    public void reconcileRunningJobs() {
        List<IndexingJobEntity> runningJobs = indexingJobRepository.findByStatus(JobStatus.RUNNING);
        if (runningJobs.isEmpty()) {
            return;
        }

        runningJobs.forEach(this::refreshJobProgress);
    }

    private IndexingJobEntity createJob(List<ImageEntity> images, JobStatus status, boolean started) {
        IndexingJobEntity job = IndexingJobEntity.builder()
                .triggeredBy(resolveCurrentUser())
                .status(status)
                .totalImages(images.size())
                .successCount(0)
                .failedCount(0)
                .startedAt(started ? LocalDateTime.now() : null)
                .build();
        indexingJobRepository.save(job);
        createJobItems(job, images);
        return job;
    }

    private void createJobItems(IndexingJobEntity job, List<ImageEntity> images) {
        List<IndexingJobItemEntity> items = images.stream()
                .filter(image -> image.getId() != null)
                .map(image -> IndexingJobItemEntity.builder()
                        .indexingJob(job)
                        .image(image)
                        .status(image.getIndexStatus())
                        .retryCount(0)
                        .errorMessage(image.getErrorMessage())
                        .build())
                .toList();
        indexingJobItemRepository.saveAll(items);
    }

    private List<ImageEntity> resolveImagesForJob(IndexingJobRequest request) {
        if (request != null && request.getImageIds() != null && !request.getImageIds().isEmpty()) {
            return imageRepository.findAllById(request.getImageIds());
        }

        return imageRepository.findByIndexStatusIn(List.of(
                ImageIndexStatus.PENDING,
                ImageIndexStatus.FAILED
        ));
    }

    private void triggerAsyncIndexing(List<ImageEntity> images) {
        for (ImageEntity image : images) {
            if (image == null || image.getId() == null) {
                continue;
            }
            boolean timedOutProcessing = image.getIndexStatus() == ImageIndexStatus.PROCESSING && isProcessingTimedOut(image);
            if (timedOutProcessing) {
                log.warn("Image {} has stale PROCESSING status. Resetting and retrying indexing", image.getId());
            }

            if (image.getIndexStatus() == ImageIndexStatus.PENDING
                    || image.getIndexStatus() == ImageIndexStatus.FAILED
                    || timedOutProcessing) {
                image.setIndexStatus(ImageIndexStatus.PROCESSING);
                image.setErrorMessage(null);
                imageRepository.save(image);
                imageIndexingService.indexImageAsync(image.getId());
            }
        }
    }

    private void scheduleAsyncIndexing(List<ImageEntity> images) {
        List<Long> imageIds = images.stream()
                .filter(image -> image != null && image.getId() != null)
                .map(ImageEntity::getId)
                .distinct()
                .collect(Collectors.toList());

        if (imageIds.isEmpty()) {
            return;
        }

        Runnable dispatch = () -> triggerAsyncIndexing(imageRepository.findAllById(imageIds));
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            dispatch.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                dispatch.run();
            }
        });
    }

    private List<ImageEntity> jobImages(IndexingJobEntity job) {
        return indexingJobItemRepository.findByIndexingJobId(job.getId()).stream()
                .map(IndexingJobItemEntity::getImage)
                .filter(image -> image != null && image.getId() != null)
                .toList();
    }

    private void refreshJobProgress(IndexingJobEntity job) {
        if (job == null || job.getId() == null) {
            return;
        }

        List<IndexingJobItemEntity> items = indexingJobItemRepository.findByIndexingJobId(job.getId());
        syncJobItemStatuses(items);

        int totalImages = items.size();
        int successCount = countByStatus(items, ImageIndexStatus.INDEXED);
        int failedCount = countByStatus(items, ImageIndexStatus.FAILED);
        int processingCount = countByStatus(items, ImageIndexStatus.PROCESSING);
        int pendingCount = countByStatus(items, ImageIndexStatus.PENDING);

        job.setTotalImages(totalImages);
        job.setSuccessCount(successCount);
        job.setFailedCount(failedCount);

        if (totalImages == 0) {
            job.setStatus(JobStatus.COMPLETED);
            if (job.getFinishedAt() == null) {
                job.setFinishedAt(LocalDateTime.now());
            }
        } else if (processingCount > 0 || (pendingCount > 0 && job.getStartedAt() != null && job.getStatus() != JobStatus.PENDING)) {
            job.setStatus(JobStatus.RUNNING);
            job.setFinishedAt(null);
        } else if (pendingCount > 0) {
            job.setStatus(JobStatus.PENDING);
            job.setFinishedAt(null);
        } else if (failedCount == 0) {
            job.setStatus(JobStatus.COMPLETED);
            if (job.getFinishedAt() == null) {
                job.setFinishedAt(LocalDateTime.now());
            }
        } else if (successCount == 0) {
            job.setStatus(JobStatus.FAILED);
            if (job.getFinishedAt() == null) {
                job.setFinishedAt(LocalDateTime.now());
            }
        } else {
            job.setStatus(JobStatus.PARTIALLY_FAILED);
            if (job.getFinishedAt() == null) {
                job.setFinishedAt(LocalDateTime.now());
            }
        }

        indexingJobRepository.save(job);
    }

    private void syncJobItemStatuses(List<IndexingJobItemEntity> items) {
        boolean changed = false;
        for (IndexingJobItemEntity item : items) {
            ImageEntity image = item.getImage();
            if (image == null) {
                continue;
            }

            if (image.getIndexStatus() == ImageIndexStatus.PROCESSING && isProcessingTimedOut(image)) {
                markImageTimedOut(image);
            }

            ImageIndexStatus imageStatus = image.getIndexStatus();
            if (imageStatus != item.getStatus()) {
                item.setStatus(imageStatus);
                changed = true;
            }
            if (item.getErrorMessage() == null ? image.getErrorMessage() != null : !item.getErrorMessage().equals(image.getErrorMessage())) {
                item.setErrorMessage(image.getErrorMessage());
                changed = true;
            }
            if ((imageStatus == ImageIndexStatus.INDEXED || imageStatus == ImageIndexStatus.FAILED) && item.getProcessedAt() == null) {
                item.setProcessedAt(image.getIndexedAt() != null ? image.getIndexedAt() : LocalDateTime.now());
                changed = true;
            }
        }

        if (changed) {
            indexingJobItemRepository.saveAll(items);
        }
    }

    private int countByStatus(List<IndexingJobItemEntity> items, ImageIndexStatus status) {
        return (int) items.stream().filter(item -> item.getStatus() == status).count();
    }

    private boolean isProcessingTimedOut(ImageEntity image) {
        if (image == null || image.getUpdatedAt() == null || processingTimeoutMinutes <= 0) {
            return false;
        }
        return image.getUpdatedAt().isBefore(LocalDateTime.now().minusMinutes(processingTimeoutMinutes));
    }

    private void markImageTimedOut(ImageEntity image) {
        image.setIndexStatus(ImageIndexStatus.FAILED);
        image.setIndexedAt(null);
        if (image.getErrorMessage() == null || image.getErrorMessage().isBlank()) {
            image.setErrorMessage("Indexing timed out while waiting for background processing");
        }
        imageRepository.save(image);
    }

    private IndexingJobEntity requireJob(Long jobId) {
        return indexingJobRepository.findById(jobId)
                .orElseThrow(() -> new IndexingJobNotFoundException("Indexing job not found: " + jobId));
    }

    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : null;
        if (username == null) {
            return null;
        }

        return userRepository.findByUsername(username).orElse(null);
    }

    private int getInt(Map<String, Object> params, String key, int defaultValue) {
        if (params == null || !params.containsKey(key) || params.get(key) == null) {
            return defaultValue;
        }
        return Integer.parseInt(params.get(key).toString());
    }

    private boolean isTerminal(JobStatus status) {
        return status == JobStatus.COMPLETED || status == JobStatus.FAILED || status == JobStatus.PARTIALLY_FAILED;
    }

    private IndexingJobResponse toResponse(IndexingJobEntity job) {
        double progress = job.getTotalImages() == null || job.getTotalImages() == 0
                ? 0.0
                : ((job.getSuccessCount() == null ? 0 : job.getSuccessCount()) + (job.getFailedCount() == null ? 0 : job.getFailedCount()))
                * 100.0 / job.getTotalImages();

        return IndexingJobResponse.builder()
                .id(job.getId())
                .status(job.getStatus())
                .totalImages(job.getTotalImages())
                .successCount(job.getSuccessCount())
                .failedCount(job.getFailedCount())
                .errorMessage(job.getErrorMessage())
                .createdAt(job.getCreatedAt())
                .startedAt(job.getStartedAt())
                .finishedAt(job.getFinishedAt())
                .progressPercentage(progress)
                .build();
    }

    private IndexingJobSummaryResponse toSummaryResponse(IndexingJobEntity job) {
        IndexingJobResponse response = toResponse(job);
        return IndexingJobSummaryResponse.builder()
                .id(response.getId())
                .status(response.getStatus())
                .totalImages(response.getTotalImages())
                .successCount(response.getSuccessCount())
                .failedCount(response.getFailedCount())
                .createdAt(response.getCreatedAt())
                .startedAt(response.getStartedAt())
                .finishedAt(response.getFinishedAt())
                .progressPercentage(response.getProgressPercentage())
                .build();
    }

    private IndexingJobItemResponse toItemResponse(IndexingJobItemEntity item) {
        return IndexingJobItemResponse.builder()
                .id(item.getId())
                .jobId(item.getIndexingJob() == null ? null : item.getIndexingJob().getId())
                .imageId(item.getImage() == null ? null : item.getImage().getId())
                .status(item.getStatus())
                .retryCount(item.getRetryCount())
                .processingTime(item.getProcessingTime())
                .errorMessage(item.getErrorMessage())
                .createdAt(item.getCreatedAt())
                .processedAt(item.getProcessedAt())
                .build();
    }
}
