package com.imagesearch.backend_java.search.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.search.config.QdrantProperties;
import com.imagesearch.backend_java.search.config.SearchConfig;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.HttpUrl;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class QdrantVectorService {
    private final OkHttpClient okHttpClient;
    private final Gson gson;
    private final QdrantProperties properties;
    private final SearchConfig searchConfig;

    /**
     * Chạy sau khi Spring Boot khởi động xong và tạo collection Qdrant nếu được cấu hình.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void initializeCollectionOnStartup() {
        if (!properties.isInitializeOnStartup()) {
            return;
        }

        try {
            ensureImageCollection();
        } catch (IOException e) {
            log.warn("Could not initialize Qdrant collection '{}': {}", properties.getCollectionName(), e.getMessage());
        }
    }

    /**
     * Kiểm tra collection ảnh đã tồn tại trong Qdrant hay chưa.
     * Nếu Qdrant trả về 404 thì tạo collection mới với vector size và distance lấy từ config.
     */
    public void ensureImageCollection() throws IOException {
        String collectionUrl = collectionUrl();
        Request getRequest = new Request.Builder()
                .url(collectionUrl)
                .get()
                .build();

        try (Response response = okHttpClient.newCall(getRequest).execute()) {
            if (response.isSuccessful()) {
                return;
            }

            if (response.code() != 404) {
                throw new IOException("Qdrant collection check failed: HTTP " + response.code());
            }
        }

        Map<String, Object> vectorConfig = Map.of(
                "size", properties.getVectorSize(),
                "distance", properties.getDistance()
        );
        Map<String, Object> body = Map.of("vectors", vectorConfig);

        Request putRequest = new Request.Builder()
                .url(collectionUrl)
                .put(RequestBody.create(gson.toJson(body), searchConfig.getJsonMediaType()))
                .build();

        try (Response response = okHttpClient.newCall(putRequest).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Qdrant collection creation failed: HTTP " + response.code());
            }
        }
    }

    /**
     * Lưu embedding của ảnh vào Qdrant, dùng image id làm point id.
     * ImageEntity phải được lưu vào database trước để có id.
     */
    public void upsertImageEmbedding(ImageEntity image) throws IOException {
        if (image.getId() == null) {
            throw new IllegalArgumentException("Image id is required for Qdrant point id");
        }
        if (image.getEmbedding() == null || image.getEmbedding().isEmpty()) {
            throw new IllegalArgumentException("Image embedding is required");
        }

        upsertImageEmbedding(image.getId(), image.getEmbedding());
    }

    /**
     * Upsert một vector point vào Qdrant.
     * Project không lưu payload trong Qdrant, metadata ảnh sẽ được lấy từ PostgreSQL theo id.
     */
    public void upsertImageEmbedding(Long imageId, List<Float> embedding) throws IOException {
        validateEmbedding(embedding);

        QdrantPoint point = QdrantPoint.builder()
                .id(imageId)
                .vector(embedding)
                .build();

        Map<String, Object> body = Map.of("points", List.of(point));

        HttpUrl url = HttpUrl.parse(collectionUrl() + "/points")
                .newBuilder()
                .addQueryParameter("wait", "true")
                .build();

        Request request = new Request.Builder()
                .url(url)
                .put(RequestBody.create(gson.toJson(body), searchConfig.getJsonMediaType()))
                .build();

        try (Response response = okHttpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Qdrant point upsert failed: HTTP " + response.code());
            }
        }
    }

    /**
     * Tìm kiếm ảnh tương đồng trong Qdrant bằng vector embedding.
     * Response chỉ cần point id và score, payload đang được tắt.
     */
    public JsonObject searchByEmbedding(List<Float> embedding, int limit) throws IOException {
        return searchByEmbedding(embedding, limit, null, null);
    }

    /**
     * Tìm kiếm ảnh tương đồng, có thể kèm theo bộ lọc cứng (payload filter) nhắm vào
     * các trường metadata_ai (vd. category, color) đã được bóc tách từ câu tìm kiếm.
     */
    public JsonObject searchByEmbedding(List<Float> embedding, int limit, Map<String, List<String>> filters, Map<String, List<String>> negativeFilters) throws IOException {
        validateEmbedding(embedding);

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("vector", embedding);
        body.put("limit", limit);

        JsonObject filterJson = buildPayloadFilter(filters, negativeFilters);
        if (filterJson != null) {
            body.put("filter", filterJson);
        }

        Request request = new Request.Builder()
                .url(collectionUrl() + "/points/search")
                .post(RequestBody.create(gson.toJson(body), searchConfig.getJsonMediaType()))
                .build();

        try (Response response = okHttpClient.newCall(request).execute()) {
            String raw = response.body() == null ? "" : response.body().string();
            if (!response.isSuccessful()) {
                throw new IOException("Qdrant vector search failed: HTTP " + response.code() + " " + raw);
            }
            return gson.fromJson(raw, JsonObject.class);
        }
    }

    /**
     * Build Qdrant filter khớp chính xác payload metadata_ai.<attr>, dựa theo
     * filter và negative filter mà AI service bóc tách từ câu tìm kiếm.
     */
    private JsonObject buildPayloadFilter(Map<String, List<String>> filters, Map<String, List<String>> negativeFilters) {
        boolean hasFilters = filters != null && !filters.isEmpty();
        boolean hasNegativeFilters = negativeFilters != null && !negativeFilters.isEmpty();
        
        if (!hasFilters && !hasNegativeFilters) {
            return null;
        }

        JsonObject filterJson = new JsonObject();

        if (hasFilters) {
            JsonArray must = new JsonArray();
            for (Map.Entry<String, List<String>> entry : filters.entrySet()) {
                List<String> values = entry.getValue();
                if (values == null || values.isEmpty()) {
                    continue;
                }
                must.add(createCondition(entry.getKey(), values));
            }
            if (!must.isEmpty()) {
                filterJson.add("must", must);
            }
        }

        if (hasNegativeFilters) {
            JsonArray mustNot = new JsonArray();
            for (Map.Entry<String, List<String>> entry : negativeFilters.entrySet()) {
                List<String> values = entry.getValue();
                if (values == null || values.isEmpty()) {
                    continue;
                }
                mustNot.add(createCondition(entry.getKey(), values));
            }
            if (!mustNot.isEmpty()) {
                filterJson.add("must_not", mustNot);
            }
        }

        if (!filterJson.has("must") && !filterJson.has("must_not")) {
            return null;
        }
        return filterJson;
    }

    private JsonObject createCondition(String key, List<String> values) {
        JsonObject condition = new JsonObject();
        condition.addProperty("key", "metadata_ai." + key);

        JsonObject match = new JsonObject();
        if (values.size() == 1) {
            // Chỉ 1 giá trị: khớp tuyệt đối (MatchValue)
            match.addProperty("value", values.get(0));
        } else {
            // Nhiều giá trị: khớp 1 trong danh sách (MatchAny)
            JsonArray any = new JsonArray();
            values.forEach(any::add);
            match.add("any", any);
        }
        condition.add("match", match);
        return condition;
    }

    /**
     * Uses an existing Qdrant point as the nearest-neighbour query, so no embedding service is needed.
     */
    public JsonObject searchByPointId(Long imageId, int limit) throws IOException {
        if (imageId == null) {
            throw new IllegalArgumentException("Image id is required");
        }

        Map<String, Object> body = Map.of(
                "query", imageId,
                "limit", limit,
                "with_payload", false,
                "with_vector", false
        );

        Request request = new Request.Builder()
                .url(collectionUrl() + "/points/query")
                .post(RequestBody.create(gson.toJson(body), searchConfig.getJsonMediaType()))
                .build();

        try (Response response = okHttpClient.newCall(request).execute()) {
            String raw = response.body() == null ? "" : response.body().string();
            if (!response.isSuccessful()) {
                throw new IOException("Qdrant point search failed: HTTP " + response.code() + " " + raw);
            }
            return gson.fromJson(raw, JsonObject.class);
        }
    }

    /**
     * Xoa point embedding cua anh trong Qdrant theo image id.
     */
    public void deleteImageEmbedding(Long imageId) throws IOException {
        if (imageId == null) {
            throw new IllegalArgumentException("Image id is required");
        }

        Map<String, Object> body = Map.of("points", List.of(imageId));

        HttpUrl url = HttpUrl.parse(collectionUrl() + "/points/delete")
                .newBuilder()
                .addQueryParameter("wait", "true")
                .build();

        Request request = new Request.Builder()
                .url(url)
                .post(RequestBody.create(gson.toJson(body), searchConfig.getJsonMediaType()))
                .build();

        try (Response response = okHttpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Qdrant point delete failed: HTTP " + response.code());
            }
        }
    }

    /**
     * Kiểm tra embedding hợp lệ và đúng số chiều trước khi gọi HTTP sang Qdrant.
     */
    private void validateEmbedding(List<Float> embedding) {
        if (embedding == null || embedding.isEmpty()) {
            throw new IllegalArgumentException("Embedding is required");
        }
        if (embedding.size() != properties.getVectorSize()) {
            throw new IllegalArgumentException("Embedding size must be " + properties.getVectorSize());
        }
    }

    /**
     * Tạo URL gốc tới collection Qdrant đang được cấu hình.
     */
    private String collectionUrl() {
        return properties.getUrl() + "/collections/" + properties.getCollectionName();
    }

    /**
     * Item trong request body khi upsert point vào Qdrant.
     */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    private static class QdrantPoint {
        private Long id;
        private List<Float> vector;
    }
}
