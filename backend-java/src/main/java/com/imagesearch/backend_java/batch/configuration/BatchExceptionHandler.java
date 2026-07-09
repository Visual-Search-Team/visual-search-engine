package com.imagesearch.backend_java.batch.configuration;

import com.imagesearch.backend_java.auth.dto.BaseResponse;
import com.imagesearch.backend_java.batch.exception.BatchException;
import com.imagesearch.backend_java.batch.exception.BatchNotFoundException;
import com.imagesearch.backend_java.batch.exception.InvalidBatchStateException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;

@RestControllerAdvice
@Slf4j(topic = "BATCH-EXCEPTION-HANDLER")
public class BatchExceptionHandler {

    @ExceptionHandler(BatchNotFoundException.class)
    public ResponseEntity<BaseResponse<Void>> handleBatchNotFound(BatchNotFoundException ex) {
        log.error("Batch not found: {}", ex.getMessage());
        BaseResponse<Void> response = BaseResponse.error("BATCH_NOT_FOUND", ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(InvalidBatchStateException.class)
    public ResponseEntity<BaseResponse<Void>> handleInvalidBatchState(InvalidBatchStateException ex) {
        log.error("Invalid batch state: {}", ex.getMessage());
        BaseResponse<Void> response = BaseResponse.error("INVALID_BATCH_STATE", ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(BatchException.class)
    public ResponseEntity<BaseResponse<Void>> handleBatchException(BatchException ex) {
        log.error("Batch exception: {}", ex.getMessage());
        BaseResponse<Void> response = BaseResponse.error(ex.getErrorCode(), ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<BaseResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unexpected error", ex);
        BaseResponse<Void> response = BaseResponse.error("INTERNAL_ERROR", "An unexpected error occurred");
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
