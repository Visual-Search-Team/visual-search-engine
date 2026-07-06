package com.imagesearch.backend_java.auth.exception;

import com.imagesearch.backend_java.auth.dto.BaseResponse;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final String BAD_REQUEST_EXAMPLE = """
            {
              "success": false,
              "data": null,
              "error": {
                "code": "VALIDATION_ERROR",
                "message": "Username is required"
              },
              "timestamp": "2026-07-03T10:15:30+07:00"
            }
            """;
    private static final String UNAUTHORIZED_EXAMPLE = """
            {
              "success": false,
              "data": null,
              "error": {
                "code": "AUTH_INVALID_CREDENTIALS",
                "message": "Invalid username/email or password"
              },
              "timestamp": "2026-07-03T10:15:30+07:00"
            }
            """;
    private static final String FORBIDDEN_EXAMPLE = """
            {
              "success": false,
              "data": null,
              "error": {
                "code": "AUTH_ACCOUNT_BLOCKED",
                "message": "Account is blocked"
              },
              "timestamp": "2026-07-03T10:15:30+07:00"
            }
            """;
    private static final String NOT_FOUND_EXAMPLE = """
            {
              "success": false,
              "data": null,
              "error": {
                "code": "USER_NOT_FOUND",
                "message": "User not found"
              },
              "timestamp": "2026-07-03T10:15:30+07:00"
            }
            """;
    private static final String CONFLICT_EXAMPLE = """
            {
              "success": false,
              "data": null,
              "error": {
                "code": "USERNAME_ALREADY_EXISTS",
                "message": "Username already exists"
              },
              "timestamp": "2026-07-03T10:15:30+07:00"
            }
            """;
    private static final String SERVICE_UNAVAILABLE_EXAMPLE = """
            {
              "success": false,
              "data": null,
              "error": {
                "code": "REDIS_UNAVAILABLE",
                "message": "Redis service is unavailable"
              },
              "timestamp": "2026-07-03T10:15:30+07:00"
            }
            """;

    @ApiResponses(value = {
            @ApiResponse(responseCode = "400", description = "Bad Request",
                    content = @Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "400 Response",
                                    summary = "Handle exception when request data is invalid",
                                    value = BAD_REQUEST_EXAMPLE
                            ))),
            @ApiResponse(responseCode = "401", description = "Unauthorized",
                    content = @Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "401 Response",
                                    summary = "Handle exception when authentication fails",
                                    value = UNAUTHORIZED_EXAMPLE
                            ))),
            @ApiResponse(responseCode = "403", description = "Forbidden",
                    content = @Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "403 Response",
                                    summary = "Handle exception when user account is not allowed",
                                    value = FORBIDDEN_EXAMPLE
                            ))),
            @ApiResponse(responseCode = "404", description = "Not Found",
                    content = @Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "404 Response",
                                    summary = "Handle exception when resource is not found",
                                    value = NOT_FOUND_EXAMPLE
                            ))),
            @ApiResponse(responseCode = "409", description = "Conflict",
                    content = @Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "409 Response",
                                    summary = "Handle exception when data already exists",
                                    value = CONFLICT_EXAMPLE
                            )))
    })
    @ExceptionHandler(AuthException.class)
    public ResponseEntity<BaseResponse<Void>> handleAuthException(AuthException exception) {
        log.warn(
                "Authentication domain exception handled: status={}, code={}, message={}",
                exception.getHttpStatus(),
                exception.getCode(),
                exception.getMessage()
        );
        BaseResponse<Void> response = buildErrorResponse(exception.getCode(), exception.getMessage());

        return ResponseEntity
                .status(exception.getHttpStatus())
                .body(response);
    }

    @ResponseStatus(BAD_REQUEST)
    @ApiResponses(value = {
            @ApiResponse(responseCode = "400", description = "Bad Request",
                    content = @Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "400 Response",
                                    summary = "Handle exception when validation fails",
                                    value = BAD_REQUEST_EXAMPLE
                            )))
    })
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<BaseResponse<Void>> handleValidationException(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Request data is invalid");
        log.warn("Request validation exception handled: message={}", message);

        BaseResponse<Void> response = buildErrorResponse("VALIDATION_ERROR", message);

        return ResponseEntity.badRequest().body(response);
    }

    @ResponseStatus(UNAUTHORIZED)
    @ApiResponses(value = {
            @ApiResponse(responseCode = "401", description = "Unauthorized",
                    content = @Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "401 Response",
                                    summary = "Handle exception when credentials are invalid",
                                    value = UNAUTHORIZED_EXAMPLE
                            )))
    })
    @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
    public ResponseEntity<BaseResponse<Void>> handleBadCredentialsException(RuntimeException exception) {
        log.warn("Authentication credentials exception handled: type={}", exception.getClass().getSimpleName());
        BaseResponse<Void> response = buildErrorResponse(
                "AUTH_INVALID_CREDENTIALS",
                "Invalid username/email or password"
        );

        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(response);
    }

    @ResponseStatus(SERVICE_UNAVAILABLE)
    @ApiResponses(value = {
            @ApiResponse(responseCode = "503", description = "Service Unavailable",
                    content = @Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "503 Response",
                                    summary = "Handle exception when Redis is unavailable",
                                    value = SERVICE_UNAVAILABLE_EXAMPLE
                            )))
    })
    @ExceptionHandler(RedisConnectionFailureException.class)
    public ResponseEntity<BaseResponse<Void>> handleRedisConnectionFailureException(
            RedisConnectionFailureException exception
    ) {
        log.error("Redis connection exception handled", exception);
        BaseResponse<Void> response = buildErrorResponse(
                "REDIS_UNAVAILABLE",
                "Redis service is unavailable"
        );

        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(response);
    }

    private BaseResponse<Void> buildErrorResponse(String code, String message) {
        return BaseResponse.<Void>builder()
                .success(false)
                .data(null)
                .error(BaseResponse.Error.builder()
                        .code(code)
                        .message(message)
                        .build())
                .timestamp(OffsetDateTime.now())
                .build();
    }
}
