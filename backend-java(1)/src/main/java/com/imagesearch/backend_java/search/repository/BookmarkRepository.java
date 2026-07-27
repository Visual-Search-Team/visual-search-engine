package com.imagesearch.backend_java.search.repository;

import com.imagesearch.backend_java.search.entity.Bookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    Page<Bookmark> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    boolean existsByUserIdAndImageId(Long userId, Long imageId);

    Optional<Bookmark> findByUserIdAndImageId(Long userId, Long imageId);
}
