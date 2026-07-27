package com.imagesearch.backend_java.search.exception;

import org.springframework.http.HttpStatus;

public class ImageUploadException extends SearchException {
    public ImageUploadException(String message, Throwable cause) {
        super("IMAGE_UPLOAD_ERROR", message, HttpStatus.INTERNAL_SERVER_ERROR, cause);
    }
}
