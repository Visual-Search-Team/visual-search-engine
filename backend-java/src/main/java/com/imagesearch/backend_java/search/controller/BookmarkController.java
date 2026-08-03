package com.imagesearch.backend_java.search.controller;

import com.imagesearch.backend_java.search.dto.BaseResponse;
import com.imagesearch.backend_java.search.dto.response.BookmarkListResponse;
import com.imagesearch.backend_java.search.dto.response.CreateBookmarkResponse;
import com.imagesearch.backend_java.search.dto.response.DeleteBookmarkResponse;
import com.imagesearch.backend_java.search.exception.SearchException;
import com.imagesearch.backend_java.search.service.BookmarkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
@RequestMapping("/bookmarks")
@RequiredArgsConstructor
@Slf4j(topic = "BOOKMARK-CONTROLLER")
@Tag(name = "Bookmarks", description = "APIs for managing bookmarked images")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class BookmarkController {
    private final BookmarkService bookmarkService;

    @GetMapping
    @Operation(
            summary = "Get bookmarked images",
            description = "Returns a paginated list of images bookmarked by the authenticated user."
    )
    public BaseResponse<BookmarkListResponse> getBookmarks(
            @RequestParam(value = "page",defaultValue = "0") int page,
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize,
            Authentication authentication
    ) {
        log.info("Entered getBookmarks API");
        validatePagination(page, pageSize);
        BookmarkListResponse data = bookmarkService.getBookmarks(username(authentication), page, pageSize);
        log.info("Completed getBookmarks API");
        return BaseResponse.success(data);
    }

    @PostMapping("/{imageId}")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Create bookmark",
            description = "Adds the specified image to the authenticated user's bookmarks."
    )
    public BaseResponse<CreateBookmarkResponse> createBookmark(
            @PathVariable Long imageId,
            Authentication authentication
    ) {
        log.info("Entered createBookmark API");
        CreateBookmarkResponse data = bookmarkService.createBookmark(username(authentication), imageId);
        log.info("Completed createBookmark API");
        return BaseResponse.success(data);
    }

    @DeleteMapping("/{imageId}")
    @Operation(
            summary = "Delete bookmark",
            description = "Removes the specified image from the authenticated user's bookmarks."
    )
    public BaseResponse<DeleteBookmarkResponse> deleteBookmark(
            @PathVariable Long imageId,
            Authentication authentication
    ) {
        log.info("Entered deleteBookmark API");
        DeleteBookmarkResponse data = bookmarkService.deleteBookmark(username(authentication), imageId);
        log.info("Completed deleteBookmark API");
        return BaseResponse.success(data);
    }

    @GetMapping("/deleted")
    @Operation(
            summary = "Get deleted bookmarks",
            description = "Returns a paginated list of soft-deleted bookmarks owned by the authenticated user."
    )
    public BaseResponse<BookmarkListResponse> getDeletedBookmarks(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize,
            Authentication authentication
    ) {
        log.info("Entered getDeletedBookmarks API");
        validatePagination(page, pageSize);
        BookmarkListResponse data = bookmarkService.getDeletedBookmarks(username(authentication), page, pageSize);
        log.info("Completed getDeletedBookmarks API");
        return BaseResponse.success(data);
    }

    @PostMapping("/{imageId}/restore")
    @Operation(
            summary = "Restore bookmark",
            description = "Restores a bookmark previously removed by soft delete."
    )
    public BaseResponse<CreateBookmarkResponse> restoreBookmark(
            @PathVariable Long imageId,
            Authentication authentication
    ) {
        log.info("Entered restoreBookmark API");
        CreateBookmarkResponse data = bookmarkService.restoreBookmark(username(authentication), imageId);
        log.info("Completed restoreBookmark API");
        return BaseResponse.success(data);
    }

    @DeleteMapping("/{imageId}/permanent")
    @Operation(
            summary = "Permanently delete bookmark",
            description = "Permanently removes the specified bookmark. This action cannot be undone."
    )
    public BaseResponse<DeleteBookmarkResponse> permanentlyDeleteBookmark(
            @PathVariable Long imageId,
            Authentication authentication
    ) {
        log.info("Entered permanentlyDeleteBookmark API");
        DeleteBookmarkResponse data = bookmarkService.permanentlyDeleteBookmark(username(authentication), imageId);
        log.info("Completed permanentlyDeleteBookmark API");
        return BaseResponse.success(data);
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
