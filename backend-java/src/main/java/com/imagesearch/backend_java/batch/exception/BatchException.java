package com.imagesearch.backend_java.batch.exception;

public class BatchException extends RuntimeException {
    private String errorCode;

    public BatchException(String message) {
        super(message);
        this.errorCode = "BATCH_ERROR";
    }

    public BatchException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
