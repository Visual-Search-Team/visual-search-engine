import torch
import logging
import re
from transformers import MarianMTModel, MarianTokenizer
from app.embedding.constants import VI_EN_TRANSLATOR_NAME, BASE_MODEL_CACHE

logger = logging.getLogger(__name__)

# Nhận diện nhanh câu có khả năng là tiếng Việt hay không
_VIETNAMESE_CHARS_PATTERN = re.compile(
    r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]",
    re.IGNORECASE,
)

def looks_vietnamese(text: str) -> bool:
    return bool(_VIETNAMESE_CHARS_PATTERN.search(text))

class ViEnTranslator:
    def __init__(self, device: str = "cpu"):
        self.device = device
        logger.info(f"Đang tải model dịch thuật: {VI_EN_TRANSLATOR_NAME}")
        
        self.tokenizer = MarianTokenizer.from_pretrained(
            VI_EN_TRANSLATOR_NAME, cache_dir=BASE_MODEL_CACHE
        )
        self.model = MarianMTModel.from_pretrained(
            VI_EN_TRANSLATOR_NAME, cache_dir=BASE_MODEL_CACHE
        ).to(self.device).eval()
        
        logger.info("Load model dịch thuật thành công")

    def translate(self, text: str) -> str:
        if not text or not looks_vietnamese(text):
            return text
            
        inputs = self.tokenizer(
            [text], return_tensors="pt", padding=True, truncation=True
        ).to(self.device)
        
        with torch.inference_mode():
            translated_ids = self.model.generate(
                **inputs, max_new_tokens=64, num_beams=1
            )
            
        translated_text = self.tokenizer.batch_decode(translated_ids, skip_special_tokens=True)[0]
        logger.info(f"[Dịch] '{text}' -> '{translated_text}'")
        return translated_text

