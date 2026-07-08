package com.imagesearch.backend_java.search.controller;

import com.imagesearch.backend_java.search.dto.BaseResponse;
import com.imagesearch.backend_java.search.dto.response.DeleteAllSearchHistoryResponse;
import com.imagesearch.backend_java.search.dto.response.DeleteSearchHistoryResponse;
import com.imagesearch.backend_java.search.dto.response.SearchHistoryDetailResponse;
import com.imagesearch.backend_java.search.dto.response.SearchHistoryListResponse;
import com.imagesearch.backend_java.search.exception.SearchException;
import com.imagesearch.backend_java.search.service.SearchHistoryService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/search-history")
@RequiredArgsConstructor
@Slf4j(topic = "SEARCH-HISTORY-CONTROLLER")
@SecurityRequirement(name = "bearerAuth")
public class SearchHistoryController {
    private final SearchHistoryService searchHistoryService;

    @GetMapping
    public ResponseEntity<BaseResponse<SearchHistoryListResponse>> getHistoryList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type,
            Authentication authentication
    ) {
        try {
            log.info("Entered getHistoryList API");
            validatePagination(page, size);
            SearchHistoryListResponse data = searchHistoryService.getHistoryList(username(authentication), type, page, size);
            log.info("Completed getHistoryList API");
            return ResponseEntity.ok(BaseResponse.success(data));
        } catch (SearchException e) {
            return ResponseEntity.status(e.getStatus()).body(BaseResponse.error(e.getCode(), e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected getHistoryList error", e);
            return ResponseEntity.internalServerError().body(BaseResponse.error("SEARCH_HISTORY_ERROR", "Could not get search history"));
        }
    }

    @GetMapping("/{historyId}")
    public ResponseEntity<BaseResponse<SearchHistoryDetailResponse>> getHistoryDetail(
            @PathVariable Long historyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        try {
            log.info("Entered getHistoryDetail API");
            validatePagination(page, size);
            SearchHistoryDetailResponse data = searchHistoryService.getHistoryDetail(username(authentication), historyId, page, size);
            log.info("Completed getHistoryDetail API");
            return ResponseEntity.ok(BaseResponse.success(data));
        } catch (SearchException e) {
            return ResponseEntity.status(e.getStatus()).body(BaseResponse.error(e.getCode(), e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected getHistoryDetail error", e);
            return ResponseEntity.internalServerError().body(BaseResponse.error("SEARCH_HISTORY_ERROR", "Could not get search history detail"));
        }
    }

    @DeleteMapping("/{historyId}")
    public ResponseEntity<BaseResponse<DeleteSearchHistoryResponse>> deleteHistory(
            @PathVariable Long historyId,
            Authentication authentication
    ) {
        try {
            log.info("Entered deleteHistory API");
            DeleteSearchHistoryResponse data = searchHistoryService.deleteHistory(username(authentication), historyId);
            log.info("Completed deleteHistory API");
            return ResponseEntity.ok(BaseResponse.success(data));
        } catch (SearchException e) {
            return ResponseEntity.status(e.getStatus()).body(BaseResponse.error(e.getCode(), e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected deleteHistory error", e);
            return ResponseEntity.internalServerError().body(BaseResponse.error("SEARCH_HISTORY_ERROR", "Could not delete search history"));
        }
    }

    @DeleteMapping
    public ResponseEntity<BaseResponse<DeleteAllSearchHistoryResponse>> deleteAllHistory(Authentication authentication) {
        try {
            log.info("Entered deleteAllHistory API");
            DeleteAllSearchHistoryResponse data = searchHistoryService.deleteAllHistory(username(authentication));
            log.info("Completed deleteAllHistory API");
            return ResponseEntity.ok(BaseResponse.success(data));
        } catch (SearchException e) {
            return ResponseEntity.status(e.getStatus()).body(BaseResponse.error(e.getCode(), e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected deleteAllHistory error", e);
            return ResponseEntity.internalServerError().body(BaseResponse.error("SEARCH_HISTORY_ERROR", "Could not delete search history"));
        }
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1) {
            throw new SearchException("INVALID_PAGINATION", "Page must be >= 0 and size must be >= 1", org.springframework.http.HttpStatus.BAD_REQUEST);
        }
    }

    private String username(Authentication authentication) {
        return authentication == null ? null : authentication.getName();
    }
}
