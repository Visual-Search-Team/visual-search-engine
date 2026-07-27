package com.imagesearch.backend_java.search.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class SearchException extends RuntimeException {
    private final String code;
    private final HttpStatus status;

    public SearchException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public SearchException(String code, String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.code = code;
        this.status = status;
    }
}
