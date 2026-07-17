package com.imagesearch.backend_java.search.service;

import com.imagesearch.backend_java.auth.entity.User;
import com.imagesearch.backend_java.auth.repository.UserRepository;
import com.imagesearch.backend_java.image.service.MinIOService;
import com.imagesearch.backend_java.search.common.SearchType;
import com.imagesearch.backend_java.search.dto.response.DeleteAllSearchHistoryResponse;
import com.imagesearch.backend_java.search.dto.response.DeleteSearchHistoryResponse;
import com.imagesearch.backend_java.search.dto.response.SearchHistoryDetailResponse;
import com.imagesearch.backend_java.search.dto.response.SearchHistoryItem;
import com.imagesearch.backend_java.search.dto.response.SearchHistoryListResponse;
import com.imagesearch.backend_java.search.dto.response.SearchHistoryResultPage;
import com.imagesearch.backend_java.search.entity.SearchHistory;
import com.imagesearch.backend_java.search.exception.SearchException;
import com.imagesearch.backend_java.search.repository.SearchHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class SearchHistoryService {
    private final SearchHistoryRepository searchHistoryRepository;
    private final UserRepository userRepository;
    private final MinIOService minIOService;

    public SearchHistoryListResponse getHistoryList(String username, String type, int page, int size) {
        Long userId = resolveUserId(username);
        SearchType searchType = parseSearchType(type);
        org.springframework.data.domain.PageRequest pageRequest = org.springframework.data.domain.PageRequest.of(page, size);
        Page<SearchHistory> histories = searchType == null
                ? searchHistoryRepository.findByUserIdOrderByCreatedAtDesc(userId, pageRequest)
                : searchHistoryRepository.findByUserIdAndSearchTypeOrderByCreatedAtDesc(userId, searchType, pageRequest);

        SearchHistoryListResponse response = new SearchHistoryListResponse();
        response.setResults(histories.getContent().stream()
                .map(this::toHistoryItem)
                .toList());
        applyPage(response, histories);
        return response;
    }

    public SearchHistoryDetailResponse getHistoryDetail(String username, Long historyId, int page, int size) {
        Long userId = resolveUserId(username);
        SearchHistory history = findOwnedHistory(historyId, userId);

        SearchHistoryResultPage resultPage = new SearchHistoryResultPage();
        resultPage.setResults(Collections.emptyList());
        applyEmptyPage(resultPage, page, size);

        SearchHistoryDetailResponse response = new SearchHistoryDetailResponse();
        copyHistoryFields(response, toHistoryItem(history));
        response.setResults(resultPage);
        return response;
    }

    @Transactional
    public DeleteSearchHistoryResponse deleteHistory(String username, Long historyId) {
        Long userId = resolveUserId(username);
        SearchHistory history = findOwnedHistory(historyId, userId);
        searchHistoryRepository.delete(history);
        return DeleteSearchHistoryResponse.builder()
                .id(historyId)
                .deleted(true)
                .build();
    }

    @Transactional
    public DeleteAllSearchHistoryResponse deleteAllHistory(String username) {
        Long userId = resolveUserId(username);
        long deletedCount = searchHistoryRepository.countByUserId(userId);
        searchHistoryRepository.deleteByUserId(userId);
        return DeleteAllSearchHistoryResponse.builder()
                .deletedCount(deletedCount)
                .build();
    }

    private SearchHistory findOwnedHistory(Long historyId, Long userId) {
        return searchHistoryRepository.findByIdAndUserId(historyId, userId)
                .orElseThrow(() -> new SearchException(
                        "SEARCH_HISTORY_NOT_FOUND",
                        "Search history not found",
                        HttpStatus.NOT_FOUND
                ));
    }

    private SearchHistoryItem toHistoryItem(SearchHistory history) {
        return SearchHistoryItem.builder()
                .id(history.getId())
                .searchType(history.getSearchType() == null ? null : history.getSearchType().name())
                .queryText(history.getQueryText())
                .queryImageId(history.getQueryImageId())
                .queryImageUrl(history.getQueryImagePath() == null ? null : minIOService.getPresignedFileUrl(history.getQueryImagePath()))
                .resultCount(0)
                .processingTimeMs(history.getProcessingTimeMs())
                .createdAt(history.getCreatedAt())
                .build();
    }

    private void copyHistoryFields(SearchHistoryDetailResponse target, SearchHistoryItem source) {
        target.setId(source.getId());
        target.setSearchType(source.getSearchType());
        target.setQueryText(source.getQueryText());
        target.setQueryImageId(source.getQueryImageId());
        target.setQueryImageUrl(source.getQueryImageUrl());
        target.setResultCount(source.getResultCount());
        target.setProcessingTimeMs(source.getProcessingTimeMs());
        target.setCreatedAt(source.getCreatedAt());
    }

    private void applyPage(com.imagesearch.backend_java.search.dto.PageResponseAbstract response, Page<?> page) {
        response.setPage(page.getNumber());
        response.setSize(page.getSize());
        response.setTotalElements(page.getTotalElements());
        response.setTotalPages(page.getTotalPages());
        response.setFirst(page.isFirst());
        response.setLast(page.isLast());
    }

    private void applyEmptyPage(com.imagesearch.backend_java.search.dto.PageResponseAbstract response, int page, int size) {
        response.setPage(page);
        response.setSize(size);
        response.setTotalElements(0);
        response.setTotalPages(0);
        response.setFirst(true);
        response.setLast(true);
    }

    private SearchType parseSearchType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        return switch (type.trim().toLowerCase()) {
            case "image" -> SearchType.IMAGE_TO_IMAGE;
            case "semantic", "senmatic" -> SearchType.TEXT_SEMANTIC;
            case "ocr", "orc" -> SearchType.TEXT_OCR;
            default -> throw new SearchException(
                    "INVALID_SEARCH_TYPE",
                    "Type must be image, semantic or ocr",
                    HttpStatus.BAD_REQUEST
            );
        };
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
