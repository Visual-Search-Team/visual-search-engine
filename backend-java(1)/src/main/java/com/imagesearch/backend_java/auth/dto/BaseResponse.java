package com.imagesearch.backend_java.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BaseResponse<T> {

    private Boolean success;

    private T data;

    private Error error;

    private OffsetDateTime timestamp;

    public static <T> BaseResponse<T> success(T data) {
        return BaseResponse.<T>builder()
                .success(true)
                .data(data)
                .error(null)
                .timestamp(OffsetDateTime.now())
                .build();
    }

    public static <T> BaseResponse<T> error(String code, String message) {
        return BaseResponse.<T>builder()
                .success(false)
                .data(null)
                .error(new Error(code, message))
                .timestamp(OffsetDateTime.now())
                .build();
    }

    /* Error fields (optional) */

    @Builder
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Error {

        private String code;

        private String message;
    }
}
