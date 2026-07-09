package com.imagesearch.backend_java.index.exception;

public class ImageUploadFailedException extends IndexException {
    public ImageUploadFailedException(String message) {
        super(message);
    }

    public ImageUploadFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}
