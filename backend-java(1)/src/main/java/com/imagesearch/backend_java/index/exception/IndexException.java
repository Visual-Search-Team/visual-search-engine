package com.imagesearch.backend_java.index.exception;

public class IndexException extends RuntimeException {
    public IndexException(String message) {
        super(message);
    }

    public IndexException(String message, Throwable cause) {
        super(message, cause);
    }
}
