package com.imagesearch.backend_java.search.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.repository.ImageRepository;
import com.imagesearch.backend_java.image.service.ImageThumbnailService;
import com.imagesearch.backend_java.image.service.MinIOService;
import com.imagesearch.backend_java.search.common.SearchType;
import com.imagesearch.backend_java.search.config.SearchConfig;
import com.imagesearch.backend_java.search.dto.request.EmbeddingRequest;
import com.imagesearch.backend_java.search.dto.response.ImageSearchResponse;
import com.imagesearch.backend_java.search.dto.response.SearchResultItem;
import com.imagesearch.backend_java.search.dto.response.TextSearchResponse;
import com.imagesearch.backend_java.search.entity.ImageOcr;
import com.imagesearch.backend_java.search.entity.SearchHistory;
import com.imagesearch.backend_java.search.exception.ImageUploadException;
import com.imagesearch.backend_java.search.exception.SearchException;
import com.imagesearch.backend_java.search.repository.ImageOcrRepository;
import com.imagesearch.backend_java.search.repository.SearchHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "SEARCH-SERVICE")
public class SearchService {
    private final MinIOService minIOService;
    private final ImageThumbnailService imageThumbnailService;
    private final ImageRepository imageRepository;
    private final ImageOcrRepository imageOcrRepository;
    private final SearchHistoryRepository searchHistoryRepository;
    private final UserRepository userRepository;
    private final AiEmbeddingClient aiEmbeddingClient;
    private final QdrantVectorService qdrantVectorService;
    private final SearchConfig searchConfig;

    public ImageSearchResponse searchByImage(MultipartFile image, String username, Integer limit, Integer page, Integer pageSize) {
        long startTime = System.currentTimeMillis();
        validateImage(image);
        SearchPageCriteria pageCriteria = resolvePageCriteria(limit, page, pageSize);

        String storagePath = uploadQueryImage(image);
        String imageUrl = minIOService.getPresignedFileUrl(storagePath);

        try {
            ImageThumbnailService.ThumbnailResult thumbnail = imageThumbnailService.createThumbnail(image);

            ImageEntity queryImage = ImageEntity.builder()
                    .uploadedBy(resolveUser(username))
                    .originalFileName(image.getOriginalFilename())
                    .storagePath(storagePath)
                    .thumbnailPath(thumbnail.thumbnailPath())
                    .mimeType(normalizeContentType(image.getContentType()))
                    .fileSize(image.getSize())
                    .width(thumbnail.width())
                    .height(thumbnail.height())
                    .indexStatus(null)
                    .indexedAt(null)
                    .build();
            queryImage = imageRepository.save(queryImage);

            log.info("start call api AI embedding image");

            List<Float> embedding = aiEmbeddingClient.getImageEmbedding(EmbeddingRequest.builder()
                    .type("image")
                    .imageUrl(imageUrl)
                    .storagePath(storagePath)
                    .mimeType(queryImage.getMimeType())
                    .build());
            log.info("Get embedding success");
            List<SearchResultItem> results = searchQdrant(embedding, pageCriteria.limit());
            SearchHistory history = saveHistory(
                    username,
                    SearchType.IMAGE_TO_IMAGE,
                    null,
                    storagePath,
                    queryImage.getId(),
                    startTime
            );

            ImageSearchResponse response = new ImageSearchResponse();
            response.setSearchId(history.getId());
            response.setSearchType(SearchType.IMAGE_TO_IMAGE.name());
            response.setQueryImageUrl(imageUrl);
            response.setProcessingTimeMs(history.getProcessingTimeMs());
            applyPage(response, results, pageCriteria);
            return response;
        } catch (IOException e) {
            throw new SearchException("VECTOR_SEARCH_ERROR", "Could not search vectors", HttpStatus.INTERNAL_SERVER_ERROR, e);
        } catch (SearchException e) {
            throw e;
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new SearchException("SEARCH_ERROR", "Could not search by image", HttpStatus.INTERNAL_SERVER_ERROR, e);
        }
    }

    private String uploadQueryImage(MultipartFile image) {
        try {
            log.warn("start upload");
            return minIOService.uploadFile(image);
        } catch (Exception e) {
            log.error("Could not upload query image to MinIO", e);
            throw new ImageUploadException("Could not upload image", e);
        }
    }

    public TextSearchResponse searchByText(String query, String mode, String username, Integer limit, Integer page, Integer pageSize) {
        long startTime = System.currentTimeMillis();
        validateTextSearch(query, mode);
        SearchPageCriteria pageCriteria = resolvePageCriteria(limit, page, pageSize);

        if ("semantic".equalsIgnoreCase(mode)) {
            return searchTextSemantic(query.trim(), username, startTime, pageCriteria);
        }
        return searchTextOcr(query.trim(), username, startTime, pageCriteria);
    }

    private TextSearchResponse searchTextSemantic(String query, String username, long startTime, SearchPageCriteria pageCriteria) {
        try {
            log.info("Call AI embedding text");
            List<Float> embedding = aiEmbeddingClient.getTextEmbedding(query);
            log.info("Get embedding text success");
            List<SearchResultItem> results = searchQdrant(embedding, pageCriteria.limit());
            SearchHistory history = saveHistory(username, SearchType.TEXT_SEMANTIC, query, null, null, startTime);
            return buildTextResponse(query, "semantic", SearchType.TEXT_SEMANTIC, history, results, pageCriteria);
        } catch (IOException e) {
            throw new SearchException("AI_SERVICE_ERROR", "Could not create text embedding", HttpStatus.INTERNAL_SERVER_ERROR, e);
        }
    }

    private TextSearchResponse searchTextOcr(String query, String username, long startTime, SearchPageCriteria pageCriteria) {
        log.info("search OCR with query: {}", query);
        List<ImageOcr> ocrMatches = imageOcrRepository.findByExtractedTextContainingIgnoreCaseOrderByCreatedAtDesc(
                query,
                PageRequest.of(0, pageCriteria.limit())
        );
        List<Long> imageIds = ocrMatches.stream()
                .map(ImageOcr::getImageId)
                .distinct()
                .toList();
        Map<Long, ImageEntity> imagesById = imageRepository.findAllById(imageIds).stream()
                .collect(Collectors.toMap(ImageEntity::getId, Function.identity()));

        List<SearchResultItem> results = new ArrayList<>();
        int rank = 1;
        Set<Long> added = new HashSet<>();
        for (Long imageId : imageIds) {
            ImageEntity image = imagesById.get(imageId);
            if (image != null && added.add(imageId)) {
                results.add(toSearchResultItem(image, null, rank++));
            }
        }

        SearchHistory history = saveHistory(username, SearchType.TEXT_OCR, query, null, null, startTime);
        return buildTextResponse(query, "ocr", SearchType.TEXT_OCR, history, results, pageCriteria);
    }

    private List<SearchResultItem> searchQdrant(List<Float> embedding, int limit) throws IOException {
        JsonObject rawResult = qdrantVectorService.searchByEmbedding(embedding, limit);
        JsonArray points = rawResult.has("result") && rawResult.get("result").isJsonArray()
                ? rawResult.getAsJsonArray("result")
                : new JsonArray();

        List<QdrantHit> hits = new ArrayList<>();
        for (JsonElement pointElement : points) {
            JsonObject point = pointElement.getAsJsonObject();
            Long imageId = readPointId(point);
            if (imageId == null) {
                continue;
            }
            Float score = point.has("score") ? point.get("score").getAsFloat() : null;
            hits.add(new QdrantHit(imageId, score));
        }

        if (hits.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, ImageEntity> imagesById = imageRepository.findAllById(
                        hits.stream().map(QdrantHit::imageId).toList()
                ).stream()
                .collect(Collectors.toMap(ImageEntity::getId, Function.identity()));

        List<SearchResultItem> results = new ArrayList<>();
        int rank = 1;
        for (QdrantHit hit : hits) {
            ImageEntity image = imagesById.get(hit.imageId());
            if (image != null) {
                results.add(toSearchResultItem(image, hit.score(), rank++));
            }
        }
        return results;
    }

    private Long readPointId(JsonObject point) {
        if (!point.has("id")) {
            return null;
        }
        JsonElement id = point.get("id");
        if (id.isJsonPrimitive() && id.getAsJsonPrimitive().isNumber()) {
            return id.getAsLong();
        }
        if (id.isJsonPrimitive() && id.getAsJsonPrimitive().isString()) {
            try {
                return Long.parseLong(id.getAsString());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private SearchResultItem toSearchResultItem(ImageEntity image, Float score, int rank) {
        String imageProxyUrl = "/visual-search/v1/images/" + image.getId();

        return SearchResultItem.builder()
                .imageId(image.getId())
                .originalFilename(image.getOriginalFileName())
            .imageUrl(imageProxyUrl)
            .thumbnailUrl(imageProxyUrl)
                .similarityScore(score)
                .rankPosition(rank)
                .width(image.getWidth())
                .height(image.getHeight())
                .mimeType(image.getMimeType())
                .build();
    }

    private SearchHistory saveHistory(
            String username,
            SearchType searchType,
            String queryText,
            String queryImagePath,
            Long queryImageId,
            long startTime
    ) {
        SearchHistory history = SearchHistory.builder()
                .userId(resolveUserId(username))
                .searchType(searchType)
                .queryText(queryText)
                .queryImagePath(queryImagePath)
                .queryImageId(queryImageId)
                .processingTimeMs(System.currentTimeMillis() - startTime)
                .build();
        return searchHistoryRepository.save(history);
    }

    private TextSearchResponse buildTextResponse(
            String query,
            String mode,
            SearchType searchType,
            SearchHistory history,
            List<SearchResultItem> results,
            SearchPageCriteria pageCriteria
    ) {
        TextSearchResponse response = new TextSearchResponse();
        response.setSearchId(history.getId());
        response.setSearchType(searchType.name());
        response.setQueryText(query);
        response.setMode(mode);
        response.setProcessingTimeMs(history.getProcessingTimeMs());
        applyPage(response, results, pageCriteria);
        return response;
    }

    private SearchPageCriteria resolvePageCriteria(Integer limit, Integer page, Integer pageSize) {
        int resolvedLimit = limit == null ? searchConfig.getDefaultSearchLimit() : limit;
        int requestedPage = page == null ? searchConfig.getDefaultPage() : page;
        int resolvedPageSize = pageSize == null ? searchConfig.getDefaultPageSize() : pageSize;

        if (resolvedLimit <= 0) {
            throw new SearchException("INVALID_LIMIT", "Limit must be greater than 0", HttpStatus.BAD_REQUEST);
        }
        if (requestedPage < 0) {
            throw new SearchException("INVALID_PAGE", "Page must be greater than or equal to 0", HttpStatus.BAD_REQUEST);
        }
        if (resolvedPageSize <= 0) {
            throw new SearchException("INVALID_PAGE_SIZE", "Page size must be greater than 0", HttpStatus.BAD_REQUEST);
        }

        // API accepts page=0 as the first page, while page>0 is treated as a 1-based page number from clients.
        int zeroBasedPage = requestedPage > 0 ? requestedPage - 1 : searchConfig.getDefaultPage();
        return new SearchPageCriteria(resolvedLimit, zeroBasedPage, resolvedPageSize);
    }

    private void applyPage(ImageSearchResponse response, List<SearchResultItem> results, SearchPageCriteria pageCriteria) {
        int totalElements = results.size();
        int totalPages = calculateTotalPages(totalElements, pageCriteria.pageSize());
        int fromIndex = Math.min(pageCriteria.page() * pageCriteria.pageSize(), totalElements);
        int toIndex = Math.min(fromIndex + pageCriteria.pageSize(), totalElements);

        response.setResults(results.subList(fromIndex, toIndex));
        response.setPage(pageCriteria.page());
        response.setSize(pageCriteria.pageSize());
        response.setTotalElements(totalElements);
        response.setTotalPages(totalPages);
        response.setFirst(pageCriteria.page() == 0);
        response.setLast(totalPages == 0 || pageCriteria.page() >= totalPages - 1);
    }

    private int calculateTotalPages(int totalElements, int pageSize) {
        return totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / pageSize);
    }

    private void validateImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new SearchException("IMAGE_REQUIRED", "Image is required", HttpStatus.BAD_REQUEST);
        }
        if (image.getSize() > searchConfig.getMaxImageSizeBytes()) {
            throw new SearchException("FILE_TOO_LARGE", "Image size must not exceed 10MB", HttpStatus.PAYLOAD_TOO_LARGE);
        }

        String contentType = normalizeContentType(image.getContentType());
        if (!searchConfig.getSupportedImageTypes().contains(contentType)) {
            throw new SearchException("UNSUPPORTED_IMAGE_TYPE", "Only JPG, PNG and WebP images are supported", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        }
    }

    private void validateTextSearch(String query, String mode) {
        if (query == null || query.trim().isEmpty()) {
            throw new SearchException("QUERY_REQUIRED", "Query is required", HttpStatus.BAD_REQUEST);
        }
        if (mode == null || (!"semantic".equalsIgnoreCase(mode) && !"ocr".equalsIgnoreCase(mode))) {
            throw new SearchException("INVALID_MODE", "Mode must be semantic or ocr", HttpStatus.BAD_REQUEST);
        }
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }
        String normalized = contentType.toLowerCase(Locale.ROOT);
        return "image/jpg".equals(normalized) ? "image/jpeg" : normalized;
    }

    private Long resolveUserId(String username) {
        if (username == null) {
            return null;
        }
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElse(null);
    }

    private User resolveUser(String username) {
        if (username == null) {
            return null;
        }
        return userRepository.findByUsername(username).orElse(null);
    }

    private record QdrantHit(Long imageId, Float score) {
    }

    private record SearchPageCriteria(int limit, int page, int pageSize) {
    }
}
