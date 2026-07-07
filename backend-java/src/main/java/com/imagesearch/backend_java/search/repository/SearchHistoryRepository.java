package com.imagesearch.backend_java.search.repository;

import com.imagesearch.backend_java.search.common.SearchType;
import com.imagesearch.backend_java.search.entity.SearchHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {
    Page<SearchHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<SearchHistory> findByUserIdAndSearchTypeOrderByCreatedAtDesc(Long userId, SearchType searchType, Pageable pageable);

    Optional<SearchHistory> findByIdAndUserId(Long id, Long userId);

    List<SearchHistory> findByUserId(Long userId);

    long countByUserId(Long userId);

    void deleteByUserId(Long userId);
}
