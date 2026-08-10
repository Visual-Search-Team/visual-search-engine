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
import com.imagesearch.backend_java.search.dto.response.EmbeddingResponse;
import com.imagesearch.backend_java.search.dto.response.ImageSearchResponse;
import com.imagesearch.backend_java.search.dto.response.SearchResultItem;
import com.imagesearch.backend_java.search.dto.response.TextSearchResponse;
import com.imagesearch.backend_java.search.entity.SearchHistory;
import com.imagesearch.backend_java.search.exception.ImageUploadException;
import com.imagesearch.backend_java.search.exception.SearchException;
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

    private final SearchHistoryRepository searchHistoryRepository;
    private final UserRepository userRepository;
    private final AiEmbeddingClient aiEmbeddingClient;
    private final QdrantVectorService qdrantVectorService;
    private final SearchConfig searchConfig;

    // Ngưỡng "rớt đài": nếu score giảm đột ngột hơn mức này so với điểm liền trước,
    // coi như phần còn lại là hàng dạt (AI phân loại nhầm bị ép lấy cho đủ limit).
    private static final float ELBOW_DROP_THRESHOLD = 0.15f;
    // Ngưỡng tuyệt đối: score thấp hơn mức này thì luôn bị loại dù không rớt đột ngột.
    private static final float MIN_ABSOLUTE_SCORE = 0.22f;

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
            SearchHistory history = pageCriteria.page() == 0 ? saveHistory(
                    username,
                    SearchType.IMAGE_TO_IMAGE,
                    null,
                    storagePath,
                    queryImage.getId(),
                    startTime
            ) : null;

            ImageSearchResponse response = new ImageSearchResponse();
            response.setSearchId(history == null ? null : history.getId());
            response.setSearchType(SearchType.IMAGE_TO_IMAGE.name());
            response.setQueryImageUrl(imageUrl);
            response.setProcessingTimeMs(history == null ? System.currentTimeMillis() - startTime : history.getProcessingTimeMs());
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

    public ImageSearchResponse searchSimilarImage(Long imageId, String username, Integer limit, Integer page, Integer pageSize) {
        long startTime = System.currentTimeMillis();
        SearchPageCriteria pageCriteria = resolvePageCriteria(limit, page, pageSize);
        ImageEntity queryImage = imageRepository.findByIdAndDeletedFalse(imageId)
                .orElseThrow(() -> new SearchException("IMAGE_NOT_FOUND", "Image not found", HttpStatus.NOT_FOUND));

        try {
            // Request one extra hit because the source point itself is normally the closest result.
            JsonObject rawResult = qdrantVectorService.searchByPointId(imageId, pageCriteria.limit() + 1);
            List<SearchResultItem> results = mapQdrantResults(rawResult, imageId).stream()
                    .limit(pageCriteria.limit())
                    .toList();
            SearchHistory history = pageCriteria.page() == 0 ? saveHistory(
                    username,
                    SearchType.IMAGE_TO_IMAGE,
                    null,
                    queryImage.getStoragePath(),
                    queryImage.getId(),
                    startTime
            ) : null;

            ImageSearchResponse response = new ImageSearchResponse();
            response.setSearchId(history == null ? null : history.getId());
            response.setSearchType(SearchType.IMAGE_TO_IMAGE.name());
            response.setQueryImageUrl("/visual-search/v1/images/" + queryImage.getId());
            response.setProcessingTimeMs(history == null ? System.currentTimeMillis() - startTime : history.getProcessingTimeMs());
            applyPage(response, results, pageCriteria);
            return response;
        } catch (IOException e) {
            throw new SearchException("VECTOR_SEARCH_ERROR", "Could not search vectors", HttpStatus.INTERNAL_SERVER_ERROR, e);
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
        throw new SearchException("INVALID_MODE", "Mode must be semantic", HttpStatus.BAD_REQUEST);
    }

    public ImageSearchResponse searchComposed(MultipartFile image, String text, Float alpha, String username, Integer limit, Integer page, Integer pageSize) {
        long startTime = System.currentTimeMillis();
        validateImage(image);
        if (text == null || text.trim().isEmpty()) {
            throw new SearchException("QUERY_REQUIRED", "Text query is required for composed search", HttpStatus.BAD_REQUEST);
        }
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

            log.info("Call AI composed embedding (image + text)");
            EmbeddingResponse embeddingResponse = aiEmbeddingClient.getComposedEmbedding(storagePath, text.trim(), alpha);
            log.info("Get composed embedding success");

            List<SearchResultItem> results = searchQdrant(embeddingResponse.getEmbedding(), embeddingResponse.getFilters(), pageCriteria.limit());
            SearchHistory history = pageCriteria.page() == 0 ? saveHistory(
                    username,
                    SearchType.COMPOSED,
                    text.trim(),
                    storagePath,
                    queryImage.getId(),
                    startTime
            ) : null;

            ImageSearchResponse response = new ImageSearchResponse();
            response.setSearchId(history == null ? null : history.getId());
            response.setSearchType(SearchType.COMPOSED.name());
            response.setQueryImageUrl(imageUrl);
            response.setQueryText(text.trim());
            response.setProcessingTimeMs(history == null ? System.currentTimeMillis() - startTime : history.getProcessingTimeMs());
            applyPage(response, results, pageCriteria);
            return response;
        } catch (IOException e) {
            throw new SearchException("AI_SERVICE_ERROR", "Could not create composed embedding", HttpStatus.INTERNAL_SERVER_ERROR, e);
        } catch (SearchException e) {
            throw e;
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new SearchException("SEARCH_ERROR", "Could not search by composed query", HttpStatus.INTERNAL_SERVER_ERROR, e);
        }
    }

    private TextSearchResponse searchTextSemantic(String query, String username, long startTime, SearchPageCriteria pageCriteria) {
        try {
            log.info("Call AI embedding text");
            EmbeddingResponse embeddingResponse = aiEmbeddingClient.getTextEmbedding(query);
            log.info("Get embedding text success");
            List<SearchResultItem> results = searchQdrant(embeddingResponse.getEmbedding(), embeddingResponse.getFilters(), pageCriteria.limit());
            SearchHistory history = pageCriteria.page() == 0
                    ? saveHistory(username, SearchType.TEXT_SEMANTIC, query, null, null, startTime)
                    : null;
            return buildTextResponse(query, "semantic", SearchType.TEXT_SEMANTIC, history, results, pageCriteria);
        } catch (IOException e) {
            throw new SearchException("AI_SERVICE_ERROR", "Could not create text embedding", HttpStatus.INTERNAL_SERVER_ERROR, e);
        }
    }



    private List<SearchResultItem> searchQdrant(List<Float> embedding, int limit) throws IOException {
        return searchQdrant(embedding, null, limit);
    }

    private List<SearchResultItem> searchQdrant(List<Float> embedding, Map<String, List<String>> filters, int limit) throws IOException {
        JsonObject rawResult = qdrantVectorService.searchByEmbedding(embedding, limit, filters);
        return mapQdrantResults(rawResult, null);
    }

    private List<SearchResultItem> mapQdrantResults(JsonObject rawResult, Long excludedImageId) {
        JsonArray points = extractQdrantPoints(rawResult);

        List<QdrantHit> hits = new ArrayList<>();
        Float previousScore = null;
        for (JsonElement pointElement : points) {
            JsonObject point = pointElement.getAsJsonObject();
            Long imageId = readPointId(point);
            if (imageId == null || imageId.equals(excludedImageId)) {
                continue;
            }
            Float score = point.has("score") ? point.get("score").getAsFloat() : null;

            if (score != null) {
                boolean absoluteDrop = score < MIN_ABSOLUTE_SCORE;
                boolean elbowDrop = previousScore != null && (previousScore - score) > ELBOW_DROP_THRESHOLD;
                if (absoluteDrop || elbowDrop) {
                    // Qdrant trả kết quả theo score giảm dần, nên phần còn lại chắc chắn
                    // còn tệ hơn -> cắt bỏ toàn bộ phần đuôi thay vì lọc từng điểm.
                    break;
                }
                previousScore = score;
            }

            hits.add(new QdrantHit(imageId, score));
        }

        if (hits.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, ImageEntity> imagesById = imageRepository.findAllByIdInAndDeletedFalse(
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

    private JsonArray extractQdrantPoints(JsonObject rawResult) {
        if (rawResult == null || !rawResult.has("result")) {
            return new JsonArray();
        }
        JsonElement result = rawResult.get("result");
        if (result.isJsonArray()) {
            return result.getAsJsonArray();
        }
        if (result.isJsonObject()
                && result.getAsJsonObject().has("points")
                && result.getAsJsonObject().get("points").isJsonArray()) {
            return result.getAsJsonObject().getAsJsonArray("points");
        }
        return new JsonArray();
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
        response.setSearchId(history == null ? null : history.getId());
        response.setSearchType(searchType.name());
        response.setQueryText(query);
        response.setMode(mode);
        response.setProcessingTimeMs(history == null ? null : history.getProcessingTimeMs());
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

        int zeroBasedPage = requestedPage <= 1 ? 0 : requestedPage - 1;
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
        if (mode == null || (!"semantic".equalsIgnoreCase(mode))) {
            throw new SearchException("INVALID_MODE", "Mode must be semantic", HttpStatus.BAD_REQUEST);
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
