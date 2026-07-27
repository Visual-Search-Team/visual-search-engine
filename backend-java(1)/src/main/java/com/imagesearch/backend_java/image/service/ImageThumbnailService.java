package com.imagesearch.backend_java.image.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageThumbnailService {
    private static final int MAX_THUMBNAIL_SIZE = 320;
    private static final String THUMBNAIL_CONTENT_TYPE = "image/png";

    private final MinIOService minIOService;

    public ThumbnailResult createThumbnail(MultipartFile file) {
        try {
            BufferedImage original = ImageIO.read(file.getInputStream());
            if (original == null) {
                log.warn("Could not read image for thumbnail, filename={}, contentType={}",
                        file.getOriginalFilename(), file.getContentType());
                return ThumbnailResult.empty();
            }

            int width = original.getWidth();
            int height = original.getHeight();
            BufferedImage thumbnail = resize(original, width, height);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            ImageIO.write(thumbnail, "png", outputStream);
            byte[] bytes = outputStream.toByteArray();

            String thumbnailPath = generateThumbnailPath();
            minIOService.uploadFile(
                    new ByteArrayInputStream(bytes),
                    thumbnailPath,
                    bytes.length,
                    THUMBNAIL_CONTENT_TYPE
            );

            return new ThumbnailResult(thumbnailPath, width, height);
        } catch (Exception e) {
            log.warn("Could not create thumbnail for file '{}': {}", file.getOriginalFilename(), e.getMessage());
            return ThumbnailResult.empty();
        }
    }

    private BufferedImage resize(BufferedImage original, int width, int height) {
        double scale = Math.min(1.0, (double) MAX_THUMBNAIL_SIZE / Math.max(width, height));
        int targetWidth = Math.max(1, (int) Math.round(width * scale));
        int targetHeight = Math.max(1, (int) Math.round(height * scale));

        BufferedImage thumbnail = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = thumbnail.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.drawImage(original, 0, 0, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }
        return thumbnail;
    }

    private String generateThumbnailPath() {
        return "thumbnails/" + System.currentTimeMillis() + "_" + System.nanoTime() + ".png";
    }

    public record ThumbnailResult(String thumbnailPath, Integer width, Integer height) {
        public static ThumbnailResult empty() {
            return new ThumbnailResult(null, null, null);
        }
    }
}
