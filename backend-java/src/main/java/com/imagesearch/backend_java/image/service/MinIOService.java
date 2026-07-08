package com.imagesearch.backend_java.image.service;

import io.minio.*;
import io.minio.errors.ErrorResponseException;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class MinIOService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name:images}")
    private String bucketName;

    @Value("${minio.url}")
    private String minioUrl;

    // Upload file tới MinIO và trả về object name
    public String uploadFile(MultipartFile file) throws Exception {
        ensureBucketExists();

        String objectName = generateObjectName(Objects.requireNonNull(file.getOriginalFilename()));
        try (InputStream stream = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(stream, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
            log.info("File uploaded successfully: {}", objectName);
            return objectName;
        }
    }

    
    // Upload file với object name cụ thể
    
    public String uploadFile(MultipartFile file, String objectName) throws Exception {
        ensureBucketExists();

        try (InputStream stream = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(stream, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
            log.info("File uploaded successfully: {}", objectName);
            return objectName;
        }
    }

    // Upload file với InputStream, object name, size và content type
    public String uploadFile(InputStream inputStream, String objectName, long size, String contentType) throws Exception {
        ensureBucketExists();

        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .stream(inputStream, size, -1)
                        .contentType(contentType)
                        .build()
        );
        log.info("File uploaded successfully: {}", objectName);
        return objectName;
    }

    // Download file từ MinIO
    public InputStream downloadFile(String objectName) throws Exception {
        return minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .build()
        );
    }

    // Delete file từ MinIO
    public void deleteFile(String objectName) throws Exception {
        minioClient.removeObject(
                RemoveObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .build()
        );
        log.info("File deleted successfully: {}", objectName);
    }

    // Delete multiple files từ MinIO
    public void deleteFiles(java.util.List<String> objectNames) throws Exception {
        for (String objectName : objectNames) {
            deleteFile(objectName);
        }
    }

    // Kiểm tra file có tồn tại trong MinIO hay không
    public boolean fileExists(String objectName) throws Exception {
        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build()
            );
            return true;
        } catch (ErrorResponseException e) {
            if (e.errorResponse().code().equals("NoSuchKey")) {
                return false;
            }
            throw e;
        }
    }

    // Lấy metadata của file từ MinIO
    public StatObjectResponse getFileMetadata(String objectName) throws Exception {
        return minioClient.statObject(
                StatObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .build()
        );
    }

    // Lấy URL tải xuống có chữ ký
    public String getPresignedDownloadUrl(String objectName, int expirationSeconds) throws Exception {
        return minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                        .method(Method.GET)
                        .bucket(bucketName)
                        .object(objectName)
                        .build()
        );
    }

    // Lấy URL tải lên có chữ ký
    public String getPresignedUploadUrl(String objectName, int expirationSeconds) throws Exception {
        return minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                        .method(Method.PUT)
                        .bucket(bucketName)
                        .object(objectName)
                        .build()
        );
    }

    // Đảm bảo bucket tồn tại, nếu không thì tạo mới
    private void ensureBucketExists() throws Exception {
        if (!minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build())) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            log.info("Bucket created: {}", bucketName);
        }
    }

    // Tạo tên object duy nhất dựa trên timestamp và nanoTime
    private String generateObjectName(String originalFileName) {
        String timestamp = System.currentTimeMillis() + "_";
        String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        return timestamp + System.nanoTime() + extension;
    }

    // Lấy URL của file
    public String getFileUrl(String objectName) {
        return String.format("%s/%s/%s", minioUrl, bucketName, objectName);
    }
}
