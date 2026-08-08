package com.imagesearch.backend_java.search.controller;

import com.imagesearch.backend_java.search.dto.BaseResponse;
import com.imagesearch.backend_java.search.dto.request.SimilarySearchImageRequest;
import com.imagesearch.backend_java.search.dto.response.ImageSearchResponse;
import com.imagesearch.backend_java.search.dto.response.TextSearchResponse;
import com.imagesearch.backend_java.search.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
@Slf4j(topic = "SEARCH-CONTROLLER")
@Tag(name = "Search", description = "APIs for searching images by uploaded image or text")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class SearchController {
    private final SearchService searchService;

    @PostMapping("/image")
    @Operation(
            summary = "Search images by uploaded image",
            description = "Searches visually similar images from an uploaded image and stores the search history for the authenticated user."
    )
    public BaseResponse<ImageSearchResponse> searchByImage(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pageSize", required = false) Integer pageSize,
            Authentication authentication
    ) {
        String username = username(authentication);
        log.info("Entered searchByImage API");
        ImageSearchResponse data = searchService.searchByImage(image, username, limit, page, pageSize);
        log.info("Completed searchByImage API");
        return BaseResponse.success(data);
    }

    @PostMapping("/image/similar")
    @Operation(
            summary = "Search similar images by an indexed image id",
            description = "Uses the existing Qdrant point as the query, without creating a new embedding, and stores the search history."
    )
    public BaseResponse<ImageSearchResponse> searchSimilarImage(
            @Valid @RequestBody SimilarySearchImageRequest request,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pageSize", required = false) Integer pageSize,
            Authentication authentication
    ) {
        log.info("Entered searchSimilarImage API for image id {}", request.getImageId());
        ImageSearchResponse data = searchService.searchSimilarImage(
                request.getImageId(), username(authentication), limit, page, pageSize
        );
        return BaseResponse.success(data);
    }

    @GetMapping("/text")
    @Operation(
            summary = "Search images by text",
            description = "Searches images using a text query and search mode, then stores the search history for the authenticated user."
    )
    public BaseResponse<TextSearchResponse> searchByText(
            @RequestParam(value = "q") String query,
            @RequestParam(value = "mode") String mode,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pageSize", required = false) Integer pageSize,
            Authentication authentication
    ) {
        String username = username(authentication);
        log.info("Entered searchByText API");
        TextSearchResponse data = searchService.searchByText(query, mode, username, limit, page, pageSize);
        log.info("Completed searchByText API");
        return BaseResponse.success(data);
    }

    @PostMapping("/composed")
    @Operation(
            summary = "Search by image + text combined",
            description = "Combines image and text embeddings using weighted average to search for images matching both visual and textual criteria."
    )
    public BaseResponse<ImageSearchResponse> searchComposed(
            @RequestParam("image") MultipartFile image,
            @RequestParam("text") String text,
            @RequestParam(value = "alpha", required = false, defaultValue = "0.7") Float alpha,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pageSize", required = false) Integer pageSize,
            Authentication authentication
    ) {
        String username = username(authentication);
        log.info("Entered searchComposed API");
        ImageSearchResponse data = searchService.searchComposed(image, text, alpha, username, limit, page, pageSize);
        log.info("Completed searchComposed API");
        return BaseResponse.success(data);
    }

    private String username(Authentication authentication) {
        return authentication == null ? null : authentication.getName();
    }
}
