"""
OCR Service - sử dụng EasyOCR để trích xuất text từ ảnh.

- Khởi tạo EasyOCR reader theo kiểu Lazy (chỉ load khi gọi lần đầu).
- Hỗ trợ Tiếng Việt + Tiếng Anh.
- Model được cache vào thư mục OCR_MODEL_CACHE để tránh tải lại mỗi lần restart.
"""
import os
import logging
import threading

import numpy as np
import torch
from PIL import Image

from app.utils.text_preprocessing import preprocess_ocr_text
from app.utils.ocr_image_preprocessing import (
    preprocess_image, 
    ImageCategory, 
    CATEGORY_CONFIGS, 
    FALLBACK_CONFIG
)

logger = logging.getLogger(__name__)

# Thư mục cache model EasyOCR (tránh tải lại mỗi lần restart Docker)
_OCR_MODEL_CACHE = os.environ.get("OCR_MODEL_CACHE", "/app/ocr_model_cache")
_OCR_LANGUAGES = ["vi", "en"]


class OCRService:
    """Singleton wrapper cho EasyOCR reader."""

    def __init__(self):
        self._reader = None
        # Semaphore giới hạn tối đa 2 luồng đồng thời gọi vào model EasyOCR
        # giúp bảo vệ VRAM GPU (tránh CUDA Out Of Memory) khi có nhiều request đến cùng lúc.
        self._gpu_semaphore = threading.Semaphore(2)

    def _get_reader(self):
        """Lazy-init: chỉ tải model khi cần lần đầu tiên."""
        if self._reader is None:
            import easyocr  # import lazy để không làm chậm startup nếu OCR chưa dùng
            
            # --- MONKEY PATCH EASYOCR CHO FP16 ---
            from app.utils.ocr_image_preprocessing import apply_easyocr_fp16_patch
            apply_easyocr_fp16_patch()
            # ---------------------------------------
            
            use_gpu = torch.cuda.is_available()

            logger.info(" Đang khởi tạo EasyOCR Reader...")
            logger.info(f"   Ngôn ngữ: {_OCR_LANGUAGES}")
            logger.info(f"   Cache model: {_OCR_MODEL_CACHE}")
            logger.info(f"   GPU: {'CÓ (' + torch.cuda.get_device_name(0) + ')' if use_gpu else 'KHÔNG (fallback CPU)'}")
            os.makedirs(_OCR_MODEL_CACHE, exist_ok=True)
            self._reader = easyocr.Reader(
                _OCR_LANGUAGES,
                gpu=use_gpu,
                model_storage_directory=_OCR_MODEL_CACHE,
                verbose=False,
            )
            logger.info(" EasyOCR Reader sẵn sàng! Hỗ trợ Tiếng Việt + Tiếng Anh.")
        return self._reader

    # Trích xuất text từ ảnh
    def extract_text(self, pil_img: Image.Image, category: str | None = None) -> dict:

        # Đảm bảo ảnh ở chế độ RGB phòng trường hợp caller quên convert
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
        img_array = np.array(pil_img)
        
        # --- Bỏ tiền xử lý (Bypass) theo yêu cầu ---
        # config = FALLBACK_CONFIG
        # if category:
        #     try:
        #         cat_enum = ImageCategory(category)
        #         config = CATEGORY_CONFIGS.get(cat_enum, FALLBACK_CONFIG)
        #     except ValueError:
        #         logger.warning(f"[OCR] Invalid category '{category}', using FALLBACK_CONFIG.")
        #         pass
        
        orig_w = img_array.shape[1]
        # img_array = preprocess_image(img_array, config)
        
        # Tính tỷ lệ scale thực tế (dựa trên chiều rộng trước và sau khi xử lý)
        actual_scale_ratio = img_array.shape[1] / orig_w

        reader = self._get_reader()
        # batch_size > 1: các vùng text phát hiện được trong 1 ảnh sẽ được
        # nhận dạng theo lô thay vì từng vùng một -> tận dụng GPU tốt hơn.
        # Đổi batch_size = 1 để tránh OOM
        # Sử dụng torch.autocast (16-bit) để tăng tốc và giảm RAM GPU
        with self._gpu_semaphore:
            if torch.cuda.is_available():
                with torch.autocast(device_type='cuda', dtype=torch.float16):
                    raw_results = reader.readtext(img_array, detail=1, batch_size=2)
            else:
                raw_results = reader.readtext(img_array, detail=1, batch_size=2)

        regions = []
        text_parts = []

        for (bbox, text, conf) in raw_results:
            text = text.strip()
            if not text:
                continue
                
            # --- Tiền xử lý text (bỏ khoảng trắng, ký tự rác, spell-check) ---
            cleaned_text = preprocess_ocr_text(text, language='vi')
            
            if not cleaned_text.strip():
                continue
            
            # Khôi phục tọa độ bounding box theo tỷ lệ thực tế
            original_bbox = []
            for p in bbox:
                orig_x = int(p[0] / actual_scale_ratio)
                orig_y = int(p[1] / actual_scale_ratio)
                original_bbox.append([orig_x, orig_y])
                
            regions.append({
                "text": cleaned_text,
                "boundingBox": original_bbox,
                "confidence": round(float(conf), 4),
            })
            text_parts.append(cleaned_text)

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
