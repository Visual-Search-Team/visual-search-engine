package com.imagesearch.backend_java.search.service;

import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.repository.ImageRepository;
import com.imagesearch.backend_java.image.service.MinIOService;
import com.imagesearch.backend_java.search.dto.response.BookmarkItem;
import com.imagesearch.backend_java.search.dto.response.BookmarkListResponse;
import com.imagesearch.backend_java.search.dto.response.CreateBookmarkResponse;
import com.imagesearch.backend_java.search.dto.response.DeleteBookmarkResponse;
import com.imagesearch.backend_java.search.entity.Bookmark;
import com.imagesearch.backend_java.search.exception.SearchException;
import com.imagesearch.backend_java.search.repository.BookmarkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookmarkService {
    private final BookmarkRepository bookmarkRepository;
    private final ImageRepository imageRepository;
    private final UserRepository userRepository;
    private final MinIOService minIOService;

    @Value("${app.bookmark.cleanup.retention-days:30}")
    private long retentionDays;

    public BookmarkListResponse getBookmarks(String username, int page, int size) {
        Long userId = resolveUserId(username);
        Page<Bookmark> bookmarks = bookmarkRepository.findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(
                userId,
                org.springframework.data.domain.PageRequest.of(page, size)
        );
        return toBookmarkListResponse(bookmarks);
    }

    public BookmarkListResponse getDeletedBookmarks(String username, int page, int size) {
        Long userId = resolveUserId(username);
        Page<Bookmark> bookmarks = bookmarkRepository.findByUserIdAndIsDeletedTrueOrderByDeletedAtDesc(
                userId,
                org.springframework.data.domain.PageRequest.of(page, size)
        );
        return toBookmarkListResponse(bookmarks);
    }

    private BookmarkListResponse toBookmarkListResponse(Page<Bookmark> bookmarks) {
        Map<Long, ImageEntity> imagesById = imageRepository.findAllById(
                        bookmarks.getContent().stream().map(Bookmark::getImageId).toList()
                ).stream()
                .collect(Collectors.toMap(ImageEntity::getId, Function.identity()));

        BookmarkListResponse response = new BookmarkListResponse();
        response.setResults(bookmarks.getContent().stream()
                .map(bookmark -> toBookmarkItem(bookmark, imagesById.get(bookmark.getImageId())))
                .toList());
        applyPage(response, bookmarks);
        return response;
    }

    public CreateBookmarkResponse createBookmark(String username, Long imageId) {
        Long userId = resolveUserId(username);
        if (!imageRepository.existsById(imageId)) {
            throw new SearchException("IMAGE_NOT_FOUND", "Image not found", HttpStatus.NOT_FOUND);
        }
        if (bookmarkRepository.existsByUserIdAndImageIdAndIsDeletedFalse(userId, imageId)) {
            throw new SearchException("BOOKMARK_ALREADY_EXISTS", "Bookmark already exists", HttpStatus.CONFLICT);
        }

        try {
            Bookmark bookmark = bookmarkRepository.findByUserIdAndImageIdAndIsDeletedTrue(userId, imageId)
                    .map(deletedBookmark -> {
                        deletedBookmark.setIsDeleted(false);
                        deletedBookmark.setDeletedAt(null);
                        return bookmarkRepository.save(deletedBookmark);
                    })
                    .orElseGet(() -> bookmarkRepository.save(Bookmark.builder()
                            .userId(userId)
                            .imageId(imageId)
                            .isDeleted(false)
                            .build()));
            return CreateBookmarkResponse.builder()
                    .id(bookmark.getId())
                    .imageId(bookmark.getImageId())
                    .createdAt(bookmark.getCreatedAt())
                    .build();
        } catch (DataIntegrityViolationException e) {
            throw new SearchException("BOOKMARK_ALREADY_EXISTS", "Bookmark already exists", HttpStatus.CONFLICT, e);
        }
    }

    public DeleteBookmarkResponse deleteBookmark(String username, Long imageId) {
        Long userId = resolveUserId(username);
        Bookmark bookmark = bookmarkRepository.findByUserIdAndImageIdAndIsDeletedFalse(userId, imageId)
                .orElseThrow(() -> new SearchException("BOOKMARK_NOT_FOUND", "Bookmark not found", HttpStatus.NOT_FOUND));
        bookmark.setIsDeleted(true);
        bookmark.setDeletedAt(LocalDateTime.now());
        bookmarkRepository.save(bookmark);
        return DeleteBookmarkResponse.builder()
                .imageId(imageId)
                .deleted(true)
                .build();
    }

    public DeleteBookmarkResponse permanentlyDeleteBookmark(String username, Long imageId) {
        Long userId = resolveUserId(username);
        Bookmark bookmark = bookmarkRepository.findByUserIdAndImageId(userId, imageId)
                .orElseThrow(() -> new SearchException("BOOKMARK_NOT_FOUND", "Bookmark not found", HttpStatus.NOT_FOUND));
        bookmarkRepository.delete(bookmark);
        return DeleteBookmarkResponse.builder()
                .imageId(imageId)
                .deleted(true)
                .build();
    }

    public CreateBookmarkResponse restoreBookmark(String username, Long imageId) {
        Long userId = resolveUserId(username);
        if (bookmarkRepository.existsByUserIdAndImageIdAndIsDeletedFalse(userId, imageId)) {
            throw new SearchException("BOOKMARK_ALREADY_EXISTS", "Bookmark is not deleted", HttpStatus.CONFLICT);
        }

        Bookmark bookmark = bookmarkRepository.findByUserIdAndImageIdAndIsDeletedTrue(userId, imageId)
                .orElseThrow(() -> new SearchException("BOOKMARK_NOT_FOUND", "Deleted bookmark not found", HttpStatus.NOT_FOUND));
        bookmark.setIsDeleted(false);
        bookmark.setDeletedAt(null);
        Bookmark restoredBookmark = bookmarkRepository.save(bookmark);

        return CreateBookmarkResponse.builder()
                .id(restoredBookmark.getId())
                .imageId(restoredBookmark.getImageId())
                .createdAt(restoredBookmark.getCreatedAt())
                .build();
    }

    private BookmarkItem toBookmarkItem(Bookmark bookmark, ImageEntity image) {
        LocalDateTime permanentDeletionAt = bookmark.getDeletedAt() == null
                ? null
                : bookmark.getDeletedAt().plusDays(retentionDays);
        return BookmarkItem.builder()
                .bookmarkId(bookmark.getId())
                .imageId(bookmark.getImageId())
                .originalFilename(image == null ? null : image.getOriginalFileName())
                .imageUrl(image == null ? null : minIOService.getPresignedFileUrl(image.getStoragePath()))
                .thumbnailUrl(image == null || image.getThumbnailPath() == null ? null : minIOService.getPresignedFileUrl(image.getThumbnailPath()))
                .width(image == null ? null : image.getWidth())
                .height(image == null ? null : image.getHeight())
                .mimeType(image == null ? null : image.getMimeType())
                .bookmarkedAt(bookmark.getCreatedAt())
                .deletedAt(bookmark.getDeletedAt())
                .permanentDeletionAt(permanentDeletionAt)
                .remainingDays(calculateRemainingDays(permanentDeletionAt))
                .build();
    }

    private Long calculateRemainingDays(LocalDateTime permanentDeletionAt) {
        if (permanentDeletionAt == null) {
            return null;
        }
        long remainingSeconds = Duration.between(LocalDateTime.now(), permanentDeletionAt).getSeconds();
        if (remainingSeconds <= 0) {
            return 0L;
        }
        return (remainingSeconds + 86_399) / 86_400;
    }

    private void applyPage(com.imagesearch.backend_java.search.dto.PageResponseAbstract response, Page<?> page) {
        response.setPage(page.getNumber());
        response.setSize(page.getSize());
        response.setTotalElements(page.getTotalElements());
        response.setTotalPages(page.getTotalPages());
        response.setFirst(page.isFirst());
        response.setLast(page.isLast());
    }

    private Long resolveUserId(String username) {
        if (username == null) {
            throw new SearchException("UNAUTHORIZED", "Unauthorized", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElseThrow(() -> new SearchException("UNAUTHORIZED", "Unauthorized", HttpStatus.UNAUTHORIZED));
    }
}
