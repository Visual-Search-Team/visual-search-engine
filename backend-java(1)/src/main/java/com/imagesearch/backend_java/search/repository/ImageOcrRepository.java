package com.imagesearch.backend_java.search.repository;

import com.imagesearch.backend_java.search.entity.ImageOcr;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ImageOcrRepository extends JpaRepository<ImageOcr, Long> {
    List<ImageOcr> findByExtractedTextContainingIgnoreCaseOrderByCreatedAtDesc(String query, Pageable pageable);
}
