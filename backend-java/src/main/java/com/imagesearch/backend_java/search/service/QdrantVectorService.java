package com.imagesearch.backend_java.search.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.search.config.QdrantProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.HttpUrl;
import okhttp3.MediaType;
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
    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");

    private final OkHttpClient okHttpClient;
    private final Gson gson;
    private final QdrantProperties properties;

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
                .put(RequestBody.create(gson.toJson(body), JSON))
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
                .put(RequestBody.create(gson.toJson(body), JSON))
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
        validateEmbedding(embedding);

        Map<String, Object> body = Map.of(
                "vector", embedding,
                "limit", limit
        );

        Request request = new Request.Builder()
                .url(collectionUrl() + "/points/search")
                .post(RequestBody.create(gson.toJson(body), JSON))
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
