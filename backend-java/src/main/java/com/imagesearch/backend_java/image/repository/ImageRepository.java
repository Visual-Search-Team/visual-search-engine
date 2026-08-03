package com.imagesearch.backend_java.image.repository;

import com.imagesearch.backend_java.image.entity.ImageEntity;
import com.imagesearch.backend_java.image.enums.ImageIndexStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ImageRepository extends JpaRepository<ImageEntity, Long> {
    Optional<ImageEntity> findByStoragePath(String storagePath);

    Optional<ImageEntity> findByChecksum(String checksum);

    Optional<ImageEntity> findByChecksumAndDeletedFalse(String checksum);

    Optional<ImageEntity> findByIdAndDeletedFalse(Long id);

    boolean existsByIdAndDeletedFalse(Long id);

    List<ImageEntity> findAllByIdInAndDeletedFalse(Collection<Long> ids);

    Long countByDeletedFalse();

    Long countByIndexStatus(ImageIndexStatus indexStatus);

    Long countByIndexStatusAndDeletedFalse(ImageIndexStatus indexStatus);

    List<ImageEntity> findByIndexStatus(ImageIndexStatus indexStatus);

    List<ImageEntity> findByIndexStatusIn(List<ImageIndexStatus> statuses);

    List<ImageEntity> findByIndexStatusInAndDeletedFalse(List<ImageIndexStatus> statuses);
}
