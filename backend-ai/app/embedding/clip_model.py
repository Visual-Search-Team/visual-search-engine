import torch
import logging
import os

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

import re
import torch.nn.functional as F
from PIL import Image
from transformers import CLIPModel, CLIPProcessor, MarianMTModel, MarianTokenizer

logger = logging.getLogger(__name__)

# model FashionCLIP
_FASHION_CLIP_NAME = "patrickjohncyh/fashion-clip"

# 7 kho từ vựng thuộc tính thời trang dùng để gắn tag zero-shot.
# Giá trị ở đây cũng chính là giá trị được lưu vào metadata_ai (JSON) trong Postgres.
_ATTRIBUTE_VOCAB: dict[str, list[str]] = {
    "category": ["T-shirt", "Shirt", "Jersey", "Tank top", "Crop top", "Sweater", "Hoodie", "Jeans", "Trousers", "Skirt", "Dress", "Sneakers", "Jacket", "Coat", "Shorts", "Hat", "Cap", "Bag"],
    "color": ["Red", "Blue", "Black", "White", "Yellow", "Green", "Pink", "Grey", "Brown", "Purple", "Orange", "Beige"],
    "pattern": ["Solid", "Striped", "Plaid", "Floral", "Polka dot", "Graphic print", "Camouflage"],
    "style": ["Casual", "Formal", "Vintage", "Streetwear", "Sportswear", "Y2K", "Minimalist"],
    "material": ["Denim", "Leather", "Cotton", "Wool", "Silk", "Velvet", "Linen"],
    "fit": ["Oversized", "Slim fit", "Regular fit", "Baggy", "Skinny"],
    "gender": ["Mens", "Womens", "Unisex", "Kids"],
    "sleeve": ["Short sleeve", "Long sleeve", "Sleeveless"],
    "neckline": ["Collared", "Crew neck", "V-neck", "Turtleneck"],
    "brand": ["Nike", "Adidas", "Gucci", "Lacoste", "Chanel", "Louis Vuitton", "Puma", "Manchester United", "Burberry", "Dior", "Balenciaga", "Zara", "H&M", "Unbranded", "Owen", "Torano", "Coolmate", "Aristino", "Routine", "Biluxury", "Canifa", "Yame", "Kenta"],
}

# Prompt template riêng cho từng nhóm — cho FashionCLIP ngữ cảnh rõ ràng hơn là chỉ
# đưa mỗi từ khoá trần trụi vào text encoder, giúp phân loại zero-shot chính xác hơn.
_ATTRIBUTE_PROMPT_TEMPLATES: dict[str, str] = {
    "category": "a photo of a {label}",
    "color": "a photo of a {label} colored clothing item",
    "pattern": "a photo of a {label} pattern clothing item",
    "style": "a photo of a {label} style outfit",
    "material": "a photo of a {label} fabric clothing item",
    "fit": "a photo of a {label} fit clothing item",
    "gender": "a photo of {label} fashion clothing",
    "sleeve": "a photo of a {label} clothing item",
    "neckline": "a photo of a clothing item with a {label} neckline",
    "brand": "a photo of a {label} brand clothing item",
}

# Thư mục cache model, tránh phải tải lại mỗi lần build docker
_BASE_MODEL_CACHE = os.environ.get(
    "BASE_MODEL_CACHE",
    os.path.join(os.path.dirname(__file__), "..", "..", "base_model_cache")
)

# Model dịch máy nhỏ gọn, chạy nội bộ (không gọi API ngoài) để dịch câu tìm kiếm
# tiếng Việt sang tiếng Anh trước khi đưa vào FashionCLIP.
_VI_EN_TRANSLATOR_NAME = "Helsinki-NLP/opus-mt-vi-en"

# Nhận diện nhanh câu có khả năng là tiếng Việt hay không, dựa vào các ký tự có dấu
# đặc trưng — không dùng thư viện phát hiện ngôn ngữ ngoài để giữ mọi thứ gọn & nhanh.
# Nếu câu không có dấu tiếng Việt (vd. khách gõ tiếng Anh, tên thương hiệu...) thì bỏ
# qua bước dịch, tránh dịch nhầm làm hỏng câu query.
_VIETNAMESE_CHARS_PATTERN = re.compile(
    r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]",
    re.IGNORECASE,
)


def _looks_vietnamese(text: str) -> bool:
    return bool(_VIETNAMESE_CHARS_PATTERN.search(text))


# Từ điển Việt hóa cho từng nhãn trong _ATTRIBUTE_VOCAB — dùng để dịch kết quả
# predict_all_attributes_batch() sang tiếng Việt trước khi lưu vào metadata_ai.
# Có thể chỉnh lại chữ cho tự nhiên hơn tùy gu, đây chỉ là bản dịch mặc định hợp lý.
_ATTRIBUTE_VI_LABELS: dict[str, dict[str, str]] = {
    "category": {
        "T-shirt": "Áo thun", "Shirt": "Áo sơ mi", "Jersey": "Áo đá bóng", "Tank top": "Áo ba lỗ", "Crop top": "Áo croptop", "Sweater": "Áo len", "Hoodie": "Áo hoodie", "Jeans": "Quần jean", "Trousers": "Quần âu",
        "Skirt": "Chân váy", "Dress": "Váy đầm", "Sneakers": "Giày sneaker",
        "Jacket": "Áo khoác", "Coat": "Áo choàng", "Shorts": "Quần short",
        "Hat": "Mũ", "Cap": "Mũ lưỡi trai", "Bag": "Túi xách",
    },
    "color": {
        "Red": "Đỏ", "Blue": "Xanh dương", "Black": "Đen", "White": "Trắng",
        "Yellow": "Vàng", "Green": "Xanh lá", "Pink": "Hồng", "Grey": "Xám",
        "Brown": "Nâu", "Purple": "Tím", "Orange": "Cam", "Beige": "Be",
    },
    "pattern": {
        "Solid": "Trơn", "Striped": "Sọc", "Plaid": "Caro", "Floral": "Hoa",
        "Polka dot": "Chấm bi", "Graphic print": "In hình", "Camouflage": "Rằn ri",
    },
    "style": {
        "Casual": "Thường ngày", "Formal": "Trang trọng", "Vintage": "Cổ điển",
        "Streetwear": "Đường phố", "Sportswear": "Thể thao", "Y2K": "Phong cách Y2K",
        "Minimalist": "Tối giản",
    },
    "material": {
        "Denim": "Vải bò", "Leather": "Da", "Cotton": "Cotton", "Wool": "Len",
        "Silk": "Lụa", "Velvet": "Nhung", "Linen": "Vải lanh",
    },
    "fit": {
        "Oversized": "Rộng (Oversize)", "Slim fit": "Ôm sát", "Regular fit": "Dáng chuẩn",
        "Baggy": "Thùng thình", "Skinny": "Bó sát",
    },
    "gender": {
        "Mens": "Nam", "Womens": "Nữ", "Unisex": "Unisex", "Kids": "Trẻ em",
    },
    "sleeve": {
        "Short sleeve": "Ngắn tay", "Long sleeve": "Dài tay", "Sleeveless": "Sát nách",
    },
    "neckline": {
        "Collared": "Có cổ", "Crew neck": "Cổ tròn", "V-neck": "Cổ tim", "Turtleneck": "Cổ lọ",
    },
    "brand": {
        "Nike": "Nike", "Adidas": "Adidas", "Gucci": "Gucci", "Lacoste": "Lacoste", 
        "Chanel": "Chanel", "Louis Vuitton": "Louis Vuitton", "Puma": "Puma", 
        "Manchester United": "Manchester United", "Burberry": "Burberry", "Dior": "Dior", 
        "Balenciaga": "Balenciaga", "Zara": "Zara", "H&M": "H&M", "Unbranded": "Không rõ hãng",
        "Owen": "OWEN", "Torano": "TORANO", "Coolmate": "COOLMATE", "Aristino": "ARISTINO", 
        "Routine": "ROUTINE", "Biluxury": "BILUXURY", "Canifa": "CANIFA", "Yame": "YAME", "Kenta": "KENTA"
    },
}


# Các từ khóa "gốc" của nhóm ngành hàng — dùng khi câu tìm kiếm không khớp thẳng một
# nhãn category cụ thể nào (vd. "quần màu đen" không khớp "Quần jean"/"Quần âu"...).
# Trong trường hợp đó, gom TẤT CẢ nhãn category có chứa từ khóa này lại thành 1 danh
# sách để khóa cứng Qdrant bằng MATCH_ANY, tránh bốc nhầm sang ngành hàng khác (áo).
_BROAD_CATEGORY_KEYWORDS: list[str] = ["áo", "quần", "giày", "mũ", "váy", "túi"]


class CLIPModelWrapper:
    def __init__(self, model_name: str = _FASHION_CLIP_NAME):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Đang tải model FashionCLIP: {model_name} trên {self.device}")

        cache_dir = os.path.abspath(_BASE_MODEL_CACHE)
        os.makedirs(cache_dir, exist_ok=True)

        # Dùng thẳng thư viện transformers chuẩn hóa của HuggingFace,
        # không còn open_clip (ảnh) hay sentence-transformers + LoRA (chữ) nữa
        self.model = CLIPModel.from_pretrained(model_name, cache_dir=cache_dir).to(self.device).eval()
        self.processor = CLIPProcessor.from_pretrained(model_name, cache_dir=cache_dir)

        logger.info("Load FashionCLIP thành công")
        self._load_custom_brands()

        # Load model dịch máy VI->EN, chạy nội bộ, cache chung thư mục với FashionCLIP
        logger.info(f"Đang tải model dịch thuật: {_VI_EN_TRANSLATOR_NAME}")
        self.translator_tokenizer = MarianTokenizer.from_pretrained(
            _VI_EN_TRANSLATOR_NAME, cache_dir=cache_dir
        )
        self.translator_model = MarianMTModel.from_pretrained(
            _VI_EN_TRANSLATOR_NAME, cache_dir=cache_dir
        ).to(self.device).eval()
        logger.info("Load model dịch thuật thành công")

        # Sinh sẵn vector mẫu cho 7 nhóm thuộc tính — chỉ chạy 1 lần lúc khởi động,
        # nên việc gắn tag cho từng ảnh lúc indexing không tốn thêm chi phí forward pass nào.
        self._attribute_vectors: dict[str, torch.Tensor] = {}
        self._precompute_attribute_vocab_vectors()

    # Dịch 1 câu tiếng Việt sang tiếng Anh bằng model MarianMT nội bộ (không gọi API ngoài).
    # Dùng greedy decode (num_beams=1) để giữ tốc độ ~0.05s/câu như yêu cầu.
    def _translate_vi_to_en(self, text: str) -> str:
        inputs = self.translator_tokenizer(
            [text], return_tensors="pt", padding=True, truncation=True
        ).to(self.device)
        with torch.inference_mode():
            translated_ids = self.translator_model.generate(
                **inputs, max_new_tokens=64, num_beams=1
            )
        return self.translator_tokenizer.batch_decode(translated_ids, skip_special_tokens=True)[0]

    def _load_custom_brands(self):
        try:
            cache_dir = os.path.abspath(_BASE_MODEL_CACHE)
            file_path = os.path.join(cache_dir, "custom_brands.txt")
            if os.path.exists(file_path):
                with open(file_path, "r", encoding="utf-8") as f:
                    count = 0
                    for line in f:
                        b = line.strip()
                        if b:
                            _ATTRIBUTE_VI_LABELS["brand"][b.title()] = b.upper()
                            count += 1
                logger.info(f"Đã nạp {count} thương hiệu mới từ file custom_brands.txt")
        except Exception as e:
            logger.error(f"Lỗi khi nạp custom brands: {e}")

    def add_dynamic_brand(self, brand: str):
        brand_clean = brand.strip()
        if not brand_clean: return
        
        # Kiểm tra xem brand đã có trong từ điển chưa (không phân biệt hoa thường)
        existing_keys = [k.lower() for k in _ATTRIBUTE_VI_LABELS["brand"].keys()]
        if brand_clean.lower() not in existing_keys:
            # 1. Thêm vào bộ nhớ RAM ngay lập tức
            title_brand = brand_clean.title()
            upper_brand = brand_clean.upper()
            _ATTRIBUTE_VI_LABELS["brand"][title_brand] = upper_brand
            
            # 2. Ghi vào file trong Volume cache để khi khởi động lại Docker không bị mất
            try:
                cache_dir = os.path.abspath(_BASE_MODEL_CACHE)
                file_path = os.path.join(cache_dir, "custom_brands.txt")
                with open(file_path, "a", encoding="utf-8") as f:
                    f.write(brand_clean + "\n")
                logger.info(f"[HỌC TỰ ĐỘNG] Đã tự động thêm hãng mới vào từ điển tìm kiếm: {upper_brand}")
            except Exception as e:
                logger.error(f"Lỗi khi lưu brand mới {brand_clean}: {e}")

    def _precompute_attribute_vocab_vectors(self):
        logger.info("Đang sinh vector mẫu cho 7 nhóm thuộc tính thời trang...")
        for attr_name, labels in _ATTRIBUTE_VOCAB.items():
            template = _ATTRIBUTE_PROMPT_TEMPLATES[attr_name]
            prompts = [template.format(label=label) for label in labels]
            inputs = self.processor(
                text=prompts, return_tensors="pt", padding=True, truncation=True
            ).to(self.device)
            with torch.inference_mode():
                feat = self.model.get_text_features(**inputs)
                feat = F.normalize(feat, dim=-1)
            self._attribute_vectors[attr_name] = feat  # shape: (num_labels, dim)
        logger.info("Đã sinh xong vector mẫu cho toàn bộ thuộc tính.")

    # Trích xuất vector đặc trưng từ 1 ảnh
    def get_image_embedding(self, img: Image.Image) -> list[float]:
        inputs = self.processor(images=img, return_tensors="pt").to(self.device)
        with torch.inference_mode():
            feat = self.model.get_image_features(**inputs)
            feat = F.normalize(feat, dim=-1)
        return feat.cpu().numpy()[0].tolist()

    # Trích xuất vector đặc trưng từ nhiều ảnh (theo batch)
    def get_image_embeddings(self, imgs: list[Image.Image]) -> list[list[float]]:
        if not imgs:
            return []
        inputs = self.processor(images=imgs, return_tensors="pt").to(self.device)
        with torch.inference_mode():
            feat = self.model.get_image_features(**inputs)
            feat = F.normalize(feat, dim=-1)
        return feat.cpu().numpy().tolist()

    # Trích xuất vector đặc trưng từ text được nhập FashionCLIP.
    # Nếu câu có vẻ là tiếng Việt, dịch sang tiếng Anh trước (FashionCLIP chỉ hiểu tiếng Anh).
    def get_text_embedding(self, text: str) -> list[float]:
        query_text = text
        if _looks_vietnamese(text):
            query_text = self._translate_vi_to_en(text)
            logger.info(f"[Dịch] '{text}' -> '{query_text}'")

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

    # Gắn thuộc tính thời trang cho MỘT BATCH vector ảnh cùng lúc (1 phép nhân ma
    # trận cho cả batch mỗi nhóm thuộc tính, thay vì lặp từng ảnh) — dùng hàm này khi
    # indexing theo batch để tận dụng tối đa.
    def predict_all_attributes_batch(self, image_embeddings: list[list[float]]) -> list[dict]:
        if not image_embeddings:
            return []

        img_tensor = torch.tensor(image_embeddings, dtype=torch.float32, device=self.device)  # (B, dim)

        results: list[dict] = [dict() for _ in image_embeddings]
        with torch.inference_mode():
            for attr_name, vocab_vectors in self._attribute_vectors.items():
                # (B, dim) @ (dim, num_labels) -> (B, num_labels).
                # Cả 2 phía đều đã normalize nên đây chính là cosine similarity.
                sims = img_tensor @ vocab_vectors.T
                best_idx = sims.argmax(dim=-1).cpu().tolist()
                labels = _ATTRIBUTE_VOCAB[attr_name]
                vi_labels = _ATTRIBUTE_VI_LABELS[attr_name]
                for i, idx in enumerate(best_idx):
                    en_label = labels[idx]
                    # Việt hóa nhãn trước khi trả về; nếu thiếu trong từ điển thì
                    # fallback về nhãn tiếng Anh gốc thay vì lỗi.
                    results[i][attr_name] = vi_labels.get(en_label, en_label)

        return results

    # Bóc tách thuộc tính xuất hiện trực tiếp trong câu tìm kiếm tiếng Việt, dựa vào
    # so khớp chuỗi con với chính _ATTRIBUTE_VI_LABELS (từ điển này cũng dùng để Việt
    # hóa metadata_ai lúc indexing, nên nhãn khớp ra luôn trùng khớp tuyệt đối với giá
    # trị đã lưu trong Payload/DB).
    # Mỗi nhóm thuộc tính chỉ lấy nhãn khớp DÀI NHẤT (duyệt giảm dần theo độ dài) để
    # tránh nhãn ngắn (vd. "Áo") ăn nhầm vào nhãn dài hơn chứa nó (vd. "Áo thun").
    def extract_tags_from_text(self, text: str) -> dict[str, list[str]]:
        normalized = text.lower()
        
        # Xử lý từ đồng nghĩa trước khi match
        normalized = normalized.replace("quần đùi", "quần short")
        normalized = normalized.replace("áo phông", "áo thun")
        normalized = normalized.replace(" mu", " manchester united")
        normalized = normalized.replace(" lv", " louis vuitton")
        
        filters: dict[str, list[str]] = {}

        for attr_name, vi_labels in _ATTRIBUTE_VI_LABELS.items():
            for vi_label in sorted(vi_labels.values(), key=len, reverse=True):
                if vi_label.lower() in normalized:
                    filters[attr_name] = [vi_label]
                    break

        # Xử lý đặc biệt cho màu "xanh" (nếu không gõ rõ xanh lá hay xanh dương)
        if "color" not in filters and "xanh" in normalized:
            filters["color"] = ["Xanh dương", "Xanh lá"]

        # Broad match: "category" chưa khớp nhãn cụ thể nào, nhưng câu vẫn chứa 1 từ
        # khóa gốc (áo/quần/giày/mũ/váy/túi) -> gom hết nhãn category chứa từ khóa đó.
        if "category" not in filters:
            category_labels = _ATTRIBUTE_VI_LABELS["category"]
            for keyword in _BROAD_CATEGORY_KEYWORDS:
                if keyword in normalized:
                    matched = [label for label in category_labels.values() if keyword in label.lower()]
                    if matched:
                        filters["category"] = matched
                    break

        return filters


clip_model = CLIPModelWrapper()
