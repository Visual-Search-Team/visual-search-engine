package com.imagesearch.backend_java.batch.exception;

public class InvalidBatchStateException extends RuntimeException {
    public InvalidBatchStateException(String message) {
        super(message);
    }

    public InvalidBatchStateException(String message, Throwable cause) {
        super(message, cause);
    }
}
