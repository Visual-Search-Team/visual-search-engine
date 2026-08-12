import re
import torch
import logging
from transformers import MarianMTModel, MarianTokenizer

from app.embedding.constants import VI_EN_TRANSLATOR_NAME, BASE_MODEL_CACHE, FASHION_GLOSSARY, looks_vietnamese

logger = logging.getLogger(__name__)

class ViEnTranslator:
    def __init__(self, device: str = "cpu"):
        self.device = device
        logger.info(f"Đang tải model Dịch tiếng Việt: {VI_EN_TRANSLATOR_NAME} trên {self.device}")
        self.tokenizer = MarianTokenizer.from_pretrained(VI_EN_TRANSLATOR_NAME, cache_dir=BASE_MODEL_CACHE)
        self.model = MarianMTModel.from_pretrained(VI_EN_TRANSLATOR_NAME, cache_dir=BASE_MODEL_CACHE).to(self.device).eval()

    def translate(self, text: str) -> str:
        """
        Dịch 1 câu tiếng Việt sang tiếng Anh.
        Nếu câu không giống tiếng Việt thì bỏ qua để tránh dịch nhầm.
        """
        if not looks_vietnamese(text):
            return text

        # Thay thế từ lóng bằng glossary trước khi đưa vào máy dịch
        for vi_word, en_word in FASHION_GLOSSARY.items():
            pattern = r'\b' + re.escape(vi_word) + r'\b'
            text = re.sub(pattern, en_word, text, flags=re.IGNORECASE)

        inputs = self.tokenizer(
            [text], return_tensors="pt", padding=True, truncation=True
        ).to(self.device)
        
        with torch.inference_mode():
            translated_ids = self.model.generate(
                **inputs, max_new_tokens=64, num_beams=1
            )
            
        return self.tokenizer.batch_decode(translated_ids, skip_special_tokens=True)[0]
