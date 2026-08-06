package com.imagesearch.backend_java.search.service;

import com.imagesearch.backend_java.search.repository.BookmarkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "BOOKMARK-CLEANUP")
public class BookmarkCleanupService {
    private final BookmarkRepository bookmarkRepository;

    @Value("${app.bookmark.cleanup.enabled:true}")
    private boolean enabled;

    @Value("${app.bookmark.cleanup.retention-days:30}")
    private long retentionDays;

    @Scheduled(cron = "${app.bookmark.cleanup.cron:0 0 2 * * *}")
    @Transactional
    public void deleteExpiredBookmarks() {
        if (!enabled) {
            return;
        }
        if (retentionDays < 1) {
            log.warn("Bookmark cleanup skipped because retention-days must be at least 1");
            return;
        }

        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        int deletedCount = bookmarkRepository.deleteExpiredBookmarks(cutoff);
        if (deletedCount > 0) {
            log.info("Permanently deleted {} bookmarks soft-deleted before {}", deletedCount, cutoff);
        }
    }
}
