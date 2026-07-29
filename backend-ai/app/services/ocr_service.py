import os

# PHẢI set biến môi trường này TRƯỚC khi import paddleocr, để trỏ thư mục cache
# model về đúng chỗ cũ (PaddleOCR 3.x/PaddleX không còn tham số model_storage_directory
# như EasyOCR, mà dùng biến môi trường PADDLE_PDX_CACHE_HOME).
_OCR_MODEL_CACHE = os.environ.get("OCR_MODEL_CACHE", "/app/ocr_model_cache")
os.environ.setdefault("PADDLE_PDX_CACHE_HOME", _OCR_MODEL_CACHE)

import logging
import cv2
import torch
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Model "vi" (latin_PP-OCRv5_mobile_rec) của PaddleOCR đã bao gồm sẵn khả năng
# đọc tiếng Anh + chữ số, nên không cần khai báo mảng 2 ngôn ngữ như EasyOCR cũ
_OCR_LANG = "vi"


class OCRService:
    def __init__(self):
        self._ocr = None

    # Khởi động lười
    def _get_reader(self):
        if self._ocr is None:
            from paddleocr import PaddleOCR

            # Lưu ý: cờ CUDA này lấy theo torch, giả định paddlepaddle-gpu đã được
            # cài cùng driver CUDA trong container (torch không quyết định paddle có dùng được GPU không)
            use_gpu = torch.cuda.is_available()
            logger.info("Khởi tạo PaddleOCR")
            self._ocr = PaddleOCR(
                lang=_OCR_LANG,
                use_angle_cls=True,
                use_gpu=use_gpu,
                show_log=False,
                # Ngưỡng thấp hơn mặc định để bắt được chữ mờ, khớp với cấu hình
                # đã kiểm chứng trong notebook test-ocr.ipynb
                drop_score=0.3,
                det_db_box_thresh=0.4,
            )
            logger.info("PaddleOCR đã sẵn sàng !")
        return self._ocr

    # Tiền xử lý ảnh bằng OpenCV trước khi đưa vào PaddleOCR
    def _preprocess(self, img_array: np.ndarray) -> np.ndarray:
        # 1. Grayscale: loại bỏ nhiễu do màu sắc phức tạp của quần áo
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)

        # 2. CLAHE (tăng tương phản cục bộ): chữ in trên áo nổi bật lên
        # mà nếp gấp vải không bị chói sáng như cách tăng tương phản thông thường
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # 3. Khử nhiễu: làm mịn các chấm nhiễu do camera chất lượng thấp
        # hoặc ảnh tải từ web bị nén vỡ hạt
        denoised = cv2.fastNlMeansDenoising(enhanced, h=10, templateWindowSize=7, searchWindowSize=21)

        # PaddleOCR cần ảnh 3 kênh -> nhân bản kênh xám ra 3 kênh.
        # Không lo vấn đề thứ tự RGB/BGR ở bước này vì cả 3 kênh giờ giống hệt nhau.
        return cv2.cvtColor(denoised, cv2.COLOR_GRAY2RGB)

    # Trích xuất text từ ảnh
    def extract_text(self, pil_img: Image.Image) -> dict:
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        img_array = np.array(pil_img)
        ocr = self._get_reader()

        # Chạy 2 Lượt song song (hoặc nối tiếp) vì mỗi lượt có ưu thế riêng.
        # Lượt 1: ảnh màu gốc.
        raw_results_1 = ocr.ocr(img_array, cls=True)

        # Lượt 2: ảnh đã tiền xử lý.
        processed_img = self._preprocess(img_array)
        raw_results_2 = ocr.ocr(processed_img, cls=True)

        regions = []
        text_parts = []
        
        # Gộp kết quả của cả 2 lượt
        for raw_results in [raw_results_1, raw_results_2]:
            if raw_results and raw_results[0]:
                for line in raw_results[0]:
                    poly = line[0]
                    text = line[1][0].strip()
                    conf = line[1][1]
                    
                    if not text:
                        continue
                    regions.append({
                        "text": text,
                        "boundingBox": [[int(p[0]), int(p[1])] for p in poly],
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
            "language": _OCR_LANG,
            "regionCount": len(regions),
            "avgConfidence": avg_conf,
        }


ocr_service = OCRService()
