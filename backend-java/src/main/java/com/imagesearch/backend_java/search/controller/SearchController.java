package com.imagesearch.backend_java.search.controller;

import com.imagesearch.backend_java.search.dto.BaseResponse;
import com.imagesearch.backend_java.search.dto.response.ImageSearchResponse;
import com.imagesearch.backend_java.search.dto.response.TextSearchResponse;
import com.imagesearch.backend_java.search.exception.SearchException;
import com.imagesearch.backend_java.search.service.SearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
@Slf4j(topic = "SEARCH-CONTROLLER")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class SearchController {
    private final SearchService searchService;

    @PostMapping("/image")
    public ResponseEntity<BaseResponse<ImageSearchResponse>> searchByImage(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pageSize", required = false) Integer pageSize,
            Authentication authentication
    ) {
        try {
            String username = username(authentication);
            log.info("Entered searchByImage API");

            ImageSearchResponse data = searchService.searchByImage(image, username, limit, page, pageSize);

            log.info("Completed searchByImage API");
            return ResponseEntity.ok(BaseResponse.success(data));
        } catch (SearchException e) {
            return ResponseEntity.status(e.getStatus()).body(BaseResponse.error(e.getCode(), e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected image search error", e);
            return ResponseEntity.internalServerError().body(BaseResponse.error("SEARCH_ERROR", "Could not search by image"));
        }
    }

    @GetMapping("/text")
    public ResponseEntity<BaseResponse<TextSearchResponse>> searchByText(
            @RequestParam("q") String query,
            @RequestParam("mode") String mode,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pageSize", required = false) Integer pageSize,
            Authentication authentication
    ) {
        try {
            String username = username(authentication);
            log.info("Entered searchByText API");

            TextSearchResponse data = searchService.searchByText(query, mode, username, limit, page, pageSize);

            log.info("Completed searchByText API");
            return ResponseEntity.ok(BaseResponse.success(data));
        } catch (SearchException e) {
            return ResponseEntity.status(e.getStatus()).body(BaseResponse.error(e.getCode(), e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected text search error", e);
            return ResponseEntity.internalServerError().body(BaseResponse.error("SEARCH_ERROR", "Could not search by text"));
        }
    }

    private String username(Authentication authentication) {
        return authentication == null ? null : authentication.getName();
    }
}
