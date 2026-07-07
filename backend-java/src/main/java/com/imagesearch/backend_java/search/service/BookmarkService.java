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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookmarkService {
    private final BookmarkRepository bookmarkRepository;
    private final ImageRepository imageRepository;
    private final UserRepository userRepository;
    private final MinIOService minIOService;

    public BookmarkListResponse getBookmarks(String username, int page, int size) {
        Long userId = resolveUserId(username);
        Page<Bookmark> bookmarks = bookmarkRepository.findByUserIdOrderByCreatedAtDesc(
                userId,
                org.springframework.data.domain.PageRequest.of(page, size)
        );
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
        if (bookmarkRepository.existsByUserIdAndImageId(userId, imageId)) {
            throw new SearchException("BOOKMARK_ALREADY_EXISTS", "Bookmark already exists", HttpStatus.CONFLICT);
        }

        try {
            Bookmark bookmark = bookmarkRepository.save(Bookmark.builder()
                    .userId(userId)
                    .imageId(imageId)
                    .build());
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
        Bookmark bookmark = bookmarkRepository.findByUserIdAndImageId(userId, imageId)
                .orElseThrow(() -> new SearchException("BOOKMARK_NOT_FOUND", "Bookmark not found", HttpStatus.NOT_FOUND));
        bookmarkRepository.delete(bookmark);
        return DeleteBookmarkResponse.builder()
                .imageId(imageId)
                .deleted(true)
                .build();
    }

    private BookmarkItem toBookmarkItem(Bookmark bookmark, ImageEntity image) {
        return BookmarkItem.builder()
                .bookmarkId(bookmark.getId())
                .imageId(bookmark.getImageId())
                .originalFilename(image == null ? null : image.getOriginalFileName())
                .imageUrl(image == null ? null : minIOService.getFileUrl(image.getStoragePath()))
                .thumbnailUrl(image == null || image.getThumbnailPath() == null ? null : minIOService.getFileUrl(image.getThumbnailPath()))
                .width(image == null ? null : image.getWidth())
                .height(image == null ? null : image.getHeight())
                .mimeType(image == null ? null : image.getMimeType())
                .bookmarkedAt(bookmark.getCreatedAt())
                .build();
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
