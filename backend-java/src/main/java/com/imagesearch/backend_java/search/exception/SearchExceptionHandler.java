package com.imagesearch.backend_java.search.exception;

import com.imagesearch.backend_java.search.controller.BookmarkController;
import com.imagesearch.backend_java.search.controller.SearchController;
import com.imagesearch.backend_java.search.controller.SearchHistoryController;
import com.imagesearch.backend_java.search.dto.BaseResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {
        BookmarkController.class,
        SearchController.class,
        SearchHistoryController.class
})
@Slf4j
public class SearchExceptionHandler {

    @ExceptionHandler(SearchException.class)
    public ResponseEntity<BaseResponse<Void>> handleSearchException(SearchException exception) {
        log.warn("Search exception handled: status={}, code={}, message={}",
                exception.getStatus(), exception.getCode(), exception.getMessage());
        return ResponseEntity.status(exception.getStatus())
                .body(BaseResponse.error(exception.getCode(), exception.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<BaseResponse<Void>> handleUnexpectedException(Exception exception) {
        log.error("Unexpected search API error", exception);
        return ResponseEntity.internalServerError()
                .body(BaseResponse.error("SEARCH_ERROR", "Could not process request"));
    }
}
