package com.imagesearch.backend_java.search.repository;

import com.imagesearch.backend_java.search.entity.Bookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    Page<Bookmark> findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<Bookmark> findByUserIdAndIsDeletedTrueOrderByDeletedAtDesc(Long userId, Pageable pageable);

    boolean existsByUserIdAndImageIdAndIsDeletedFalse(Long userId, Long imageId);

    Optional<Bookmark> findByUserIdAndImageIdAndIsDeletedFalse(Long userId, Long imageId);

    Optional<Bookmark> findByUserIdAndImageIdAndIsDeletedTrue(Long userId, Long imageId);

    Optional<Bookmark> findByUserIdAndImageId(Long userId, Long imageId);

    @Modifying
    @Query("delete from Bookmark b where b.isDeleted = true and b.deletedAt < :cutoff")
    int deleteExpiredBookmarks(@Param("cutoff") LocalDateTime cutoff);
}
