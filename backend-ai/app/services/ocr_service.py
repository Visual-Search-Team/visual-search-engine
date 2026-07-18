"""
OCR Service - sử dụng EasyOCR để trích xuất text từ ảnh.

- Khởi tạo EasyOCR reader theo kiểu Lazy (chỉ load khi gọi lần đầu).
- Hỗ trợ Tiếng Việt + Tiếng Anh.
- Model được cache vào thư mục OCR_MODEL_CACHE để tránh tải lại mỗi lần restart.
"""
import os
import logging

import numpy as np
import torch
from PIL import Image

logger = logging.getLogger(__name__)

# Thư mục cache model EasyOCR (tránh tải lại mỗi lần restart Docker)
_OCR_MODEL_CACHE = os.environ.get("OCR_MODEL_CACHE", "/app/ocr_model_cache")
_OCR_LANGUAGES = ["vi", "en"]


class OCRService:
    """Singleton wrapper cho EasyOCR reader."""

    def __init__(self):
        self._reader = None

    def _get_reader(self):
        """Lazy-init: chỉ tải model khi cần lần đầu tiên."""
        if self._reader is None:
            import easyocr  # import lazy để không làm chậm startup nếu OCR chưa dùng
            use_gpu = torch.cuda.is_available()
            logger.info("=" * 55)
            logger.info("⬇️  Đang khởi tạo EasyOCR Reader...")
            logger.info(f"   Ngôn ngữ: {_OCR_LANGUAGES}")
            logger.info(f"   Cache model: {_OCR_MODEL_CACHE}")
            logger.info(f"   GPU: {'CÓ (' + torch.cuda.get_device_name(0) + ')' if use_gpu else 'KHÔNG (fallback CPU)'}")
            logger.info("=" * 55)
            os.makedirs(_OCR_MODEL_CACHE, exist_ok=True)
            self._reader = easyocr.Reader(
                _OCR_LANGUAGES,
                gpu=use_gpu,
                model_storage_directory=_OCR_MODEL_CACHE,
                verbose=False,
            )
            logger.info("✅ EasyOCR Reader sẵn sàng! Hỗ trợ Tiếng Việt + Tiếng Anh.")
        return self._reader

    # Trích xuất text từ ảnh
    def extract_text(self, pil_img: Image.Image) -> dict:

        # Đảm bảo ảnh ở chế độ RGB phòng trường hợp caller quên convert
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
        img_array = np.array(pil_img)

        reader = self._get_reader()
        # batch_size > 1: các vùng text phát hiện được trong 1 ảnh sẽ được
        # nhận dạng theo lô thay vì từng vùng một -> tận dụng GPU tốt hơn.
        raw_results = reader.readtext(img_array, detail=1, batch_size=8)

        regions = []
        text_parts = []

        for (bbox, text, conf) in raw_results:
            text = text.strip()
            if not text:
                continue
            regions.append({
                "text": text,
                "boundingBox": [[int(p[0]), int(p[1])] for p in bbox],
                "confidence": round(float(conf), 4),
            })
            text_parts.append(text)

        extracted_text = " ".join(text_parts)
        avg_conf = (
            round(sum(r["confidence"] for r in regions) / len(regions), 4)
            if regions
            else 0.0
        )

        return {
            "extractedText": extracted_text,
            "regions": regions,
            "language": ",".join(_OCR_LANGUAGES),
            "regionCount": len(regions),
            "avgConfidence": avg_conf,
        }


# Singleton — dùng chung toàn ứng dụng
ocr_service = OCRService()
