import torch
import logging
import os

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

import torch.nn.functional as F
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

from app.embedding.constants import (
    FASHION_CLIP_NAME,
    BASE_MODEL_CACHE,
    ATTRIBUTE_VOCAB,
    ATTRIBUTE_VI_LABELS,
    ATTRIBUTE_PROMPT_TEMPLATES,
    CATEGORY_PROMPTS
)
from app.embedding.translator import ViEnTranslator

logger = logging.getLogger(__name__)

class CLIPModelWrapper:
    def __init__(self, model_name: str = FASHION_CLIP_NAME):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Đang tải model FashionCLIP: {model_name} trên {self.device}")

        cache_dir = os.path.abspath(BASE_MODEL_CACHE)
        os.makedirs(cache_dir, exist_ok=True)

        self.model = CLIPModel.from_pretrained(model_name, cache_dir=cache_dir).to(self.device).eval()
        self.processor = CLIPProcessor.from_pretrained(model_name, cache_dir=cache_dir)
        logger.info("Load FashionCLIP thành công")

        # Khởi tạo Translator
        self.translator = ViEnTranslator(device=self.device)

        # Sinh sẵn vector mẫu cho 7 nhóm thuộc tính
        self._attribute_vectors: dict[str, torch.Tensor] = {}
        self._precompute_attribute_vocab_vectors()

    def _precompute_attribute_vocab_vectors(self):
        logger.info("Đang sinh vector mẫu cho 7 nhóm thuộc tính thời trang...")
        for attr_name, labels in ATTRIBUTE_VOCAB.items():
            if attr_name == "category":
                prompts = [CATEGORY_PROMPTS.get(label, f"a photo of a {label}") for label in labels]
            else:
                template = ATTRIBUTE_PROMPT_TEMPLATES[attr_name]
                prompts = [template.format(label=label) for label in labels]
                
            inputs = self.processor(
                text=prompts, return_tensors="pt", padding=True, truncation=True
            ).to(self.device)
            with torch.inference_mode():
                feat = self.model.get_text_features(**inputs)
                feat = F.normalize(feat, dim=-1)
            self._attribute_vectors[attr_name] = feat
        logger.info("Đã sinh xong vector mẫu cho toàn bộ thuộc tính.")

    def get_image_embedding(self, img: Image.Image) -> list[float]:
        inputs = self.processor(images=img, return_tensors="pt").to(self.device)
        with torch.inference_mode():
            feat = self.model.get_image_features(**inputs)
            feat = F.normalize(feat, dim=-1)
        return feat.cpu().numpy()[0].tolist()

    def get_image_embeddings(self, imgs: list[Image.Image]) -> list[list[float]]:
        if not imgs:
            return []
        inputs = self.processor(images=imgs, return_tensors="pt").to(self.device)
        with torch.inference_mode():
            feat = self.model.get_image_features(**inputs)
            feat = F.normalize(feat, dim=-1)
        return feat.cpu().numpy().tolist()

    def get_text_embedding(self, text: str) -> list[float]:
        query_text = self.translator.translate(text)

        inputs = self.processor(
            text=[query_text],
            return_tensors="pt",
            padding=True,
            truncation=True,
        ).to(self.device)
        
        with torch.inference_mode():
            feat = self.model.get_text_features(**inputs)
            feat = F.normalize(feat, dim=-1)
        return feat.cpu().numpy()[0].tolist()

    def get_composed_embedding(self, img: Image.Image, text: str, alpha: float = 0.7) -> list[float]:
        if not text or not text.strip():
            logger.info("Text trống sau khi lọc, sử dụng 100% Image Embedding cho query.")
            return self.get_image_embedding(img)

        img_emb = torch.tensor(self.get_image_embedding(img), device=self.device)
        txt_emb = torch.tensor(self.get_text_embedding(text), device=self.device)
        composed = alpha * img_emb + (1.0 - alpha) * txt_emb
        composed = F.normalize(composed, dim=-1)
        return composed.cpu().numpy().tolist()

    def predict_all_attributes(self, image_embedding: list[float]) -> dict:
        return self.predict_all_attributes_batch([image_embedding])[0]

    def predict_all_attributes_batch(self, image_embeddings: list[list[float]]) -> list[dict]:
        if not image_embeddings:
            return []

        img_tensor = torch.tensor(image_embeddings, dtype=torch.float32, device=self.device)

        results: list[dict] = [dict() for _ in image_embeddings]
        with torch.inference_mode():
            for attr_name, vocab_vectors in self._attribute_vectors.items():
                sims = img_tensor @ vocab_vectors.T
                best_idx = sims.argmax(dim=-1).cpu().tolist()
                labels = ATTRIBUTE_VOCAB[attr_name]
                vi_labels = ATTRIBUTE_VI_LABELS[attr_name]
                for i, idx in enumerate(best_idx):
                    en_label = labels[idx]
                    results[i][attr_name] = vi_labels.get(en_label, en_label)

        return results

    def add_dynamic_brand(self, new_brand: str):
        """
        Dynamically injects a new brand into the runtime vocabulary dictionaries.
        """
        normalized = new_brand.lower()
        if normalized not in ATTRIBUTE_VI_LABELS["brand"].values():
            ATTRIBUTE_VI_LABELS["brand"][normalized] = normalized
            if normalized not in ATTRIBUTE_VOCAB["brand"]:
                ATTRIBUTE_VOCAB["brand"].append(normalized)

clip_model = CLIPModelWrapper()
