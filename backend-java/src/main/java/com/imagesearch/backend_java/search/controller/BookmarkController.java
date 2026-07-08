package com.imagesearch.backend_java.search.controller;

import com.imagesearch.backend_java.search.dto.BaseResponse;
import com.imagesearch.backend_java.search.dto.response.BookmarkListResponse;
import com.imagesearch.backend_java.search.dto.response.CreateBookmarkResponse;
import com.imagesearch.backend_java.search.dto.response.DeleteBookmarkResponse;
import com.imagesearch.backend_java.search.exception.SearchException;
import com.imagesearch.backend_java.search.service.BookmarkService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/bookmarks")
@RequiredArgsConstructor
@Slf4j(topic = "BOOKMARK-CONTROLLER")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class BookmarkController {
    private final BookmarkService bookmarkService;

    @GetMapping
    public ResponseEntity<BaseResponse<BookmarkListResponse>> getBookmarks(
            @RequestParam(value = "page",defaultValue = "0") int page,
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize,
            Authentication authentication
    ) {
        try {
            log.info("Entered getBookmarks API");
            validatePagination(page, pageSize);
            BookmarkListResponse data = bookmarkService.getBookmarks(username(authentication), page, pageSize);
            log.info("Completed getBookmarks API");
            return ResponseEntity.ok(BaseResponse.success(data));
        } catch (SearchException e) {
            return ResponseEntity.status(e.getStatus()).body(BaseResponse.error(e.getCode(), e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected getBookmarks error", e);
            return ResponseEntity.internalServerError().body(BaseResponse.error("BOOKMARK_ERROR", "Could not get bookmarks"));
        }
    }

    @PostMapping("/{imageId}")
    public ResponseEntity<BaseResponse<CreateBookmarkResponse>> createBookmark(
            @PathVariable Long imageId,
            Authentication authentication
    ) {
        try {
            log.info("Entered createBookmark API");
            CreateBookmarkResponse data = bookmarkService.createBookmark(username(authentication), imageId);
            log.info("Completed createBookmark API");
            return ResponseEntity.status(201).body(BaseResponse.success(data));
        } catch (SearchException e) {
            return ResponseEntity.status(e.getStatus()).body(BaseResponse.error(e.getCode(), e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected createBookmark error", e);
            return ResponseEntity.internalServerError().body(BaseResponse.error("BOOKMARK_ERROR", "Could not create bookmark"));
        }
    }

    @DeleteMapping("/{imageId}")
    public ResponseEntity<BaseResponse<DeleteBookmarkResponse>> deleteBookmark(
            @PathVariable Long imageId,
            Authentication authentication
    ) {
        try {
            log.info("Entered deleteBookmark API");
            DeleteBookmarkResponse data = bookmarkService.deleteBookmark(username(authentication), imageId);
            log.info("Completed deleteBookmark API");
            return ResponseEntity.ok(BaseResponse.success(data));
        } catch (SearchException e) {
            return ResponseEntity.status(e.getStatus()).body(BaseResponse.error(e.getCode(), e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected deleteBookmark error", e);
            return ResponseEntity.internalServerError().body(BaseResponse.error("BOOKMARK_ERROR", "Could not delete bookmark"));
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
