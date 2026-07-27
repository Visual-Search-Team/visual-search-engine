import torch
import os
import logging 
from PIL import Image
import numpy as np


logger = logging.getLogger(__name__)

# thư mục cache model EasyOCR để không cần tải lại 
_OCR_MODEL_CACHE = os.environ.get("OCR_MODEL_CACHE","/app/ocr_model_cache")
_OCR_LANGUAGES = ["vi","en"]


class OCRService:
    def __init__(self):
        self._reader = None
    
    # Khởi động lười
    def _get_reader(self):
        if self._reader is None:
            # tải model rồi lưu vào cache
            import easyocr
            use_gpu = torch.cuda.is_available()
            logger.info(f"Khởi tạo EasyOCR")
            os.makedirs(_OCR_MODEL_CACHE,exist_ok =True)
            self._reader =easyocr.Reader(
                _OCR_LANGUAGES,
                gpu = use_gpu,
                model_storage_directory = _OCR_MODEL_CACHE,
                verbose =False,
            )
            logger.info("EasyOCR đã sẵn sàng !")
        return self._reader
    
    # Trích xuất text từ ảnh
    def extract_text(self,pil_img:Image.Image) ->dict:
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
        
        # tối ưu hóa: thu nhỏ ảnh nếu kích thước quá lớn (mục đích để tăng tốc độ)
        max_dim =1024
        if max(pil_img.size) > max_dim:
            pil_img = pil_img.copy()
            pil_img.thumbnail((max_dim,max_dim),Image.Resampling.LANCZOS)
        img_array = np.array(pil_img)
        reader =self._get_reader()
        raw_results = reader.readtext(img_array,detail =1,batch_size =8)

        regions = []
        text_parts = []

        for (bbox, text, conf) in raw_results:
            text = text.strip()
            if not text:
                continue
            regions.append({
                "text":text,
                "boundingBox": [[int(p[0]),int(p[1])] for p in bbox],
                "confidence": round(float(conf),4),
            })
            text_parts.append(text)
        
        extracted_text = " ".join(text_parts)
        avg_conf =(
            round(sum(r["confidence"] for r in regions)/len(regions),4)
            if regions
            else 0.0
        )

        return {
            "extractedText": extracted_text,
            "regions": regions,
            "language": ",".join(_OCR_LANGUAGES),
            "regionCount":len(regions),
            "avgConfidence": avg_conf,
        }

ocr_service = OCRService()