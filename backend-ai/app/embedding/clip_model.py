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
    "category": ["T-shirt", "Polo shirt", "Shirt", "Jersey", "Activewear shirt", "Tank top", "Crop top", "Sweater", "Hoodie", "Jeans", "Trousers", "Skirt", "Dress", "Sneakers", "Jacket", "Coat", "Shorts", "Hat", "Cap", "Bag"],
    "color": ["Red", "Blue", "Black", "White", "Yellow", "Green", "Pink", "Grey", "Brown", "Purple", "Orange", "Beige"],
    "pattern": ["Solid", "Striped", "Plaid", "Floral", "Polka dot", "Graphic print", "Camouflage"],
    "style": ["Casual", "Formal", "Vintage", "Streetwear", "Sportswear", "Y2K", "Minimalist"],
    "material": ["Denim", "Leather", "Cotton", "Wool", "Silk", "Velvet", "Linen"],
    "fit": ["Oversized", "Slim fit", "Regular fit", "Baggy", "Skinny"],
    "gender": ["Mens", "Womens", "Unisex", "Kids"],
    "sleeve": ["Short sleeve", "Long sleeve", "Sleeveless"],
    "neckline": ["Collared", "Collarless"],
    "brand": ["Nike", "Adidas", "Gucci", "Lacoste", "Chanel", "Louis Vuitton", "Puma", "Manchester United", "Burberry", "Dior", "Balenciaga", "Zara", "H&M", "Unbranded"],
    "view_angle": ["Front view", "Back view", "Side view"],
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
    "view_angle": "a {label} photo of the clothing item",
}

# Prompt mô tả chi tiết riêng cho từng loại category — giúp FashionCLIP phân biệt
# chính xác hơn những nhãn có embedding gần nhau (T-shirt vs Polo vs Shirt vs Jersey).
_CATEGORY_PROMPTS: dict[str, str] = {
    "T-shirt":    "a plain T-shirt with a round crew neck and no collar, no buttons, simple casual everyday top",
    "Polo shirt": "a polo shirt with a small ribbed polo collar and 2 or 3 buttons at the neck opening, sporty casual style",
    "Shirt":      "a lightweight formal button-up dress shirt with a stiff spread collar, a full button placket running down the front, worn as a single layer without side hand pockets or ribbed hems",
    "Jersey":     "a sports jersey with team logo, number print, and lightweight mesh or polyester athletic fabric",
    "Activewear shirt": "a plain athletic sports shirt, activewear, gym clothing, breathable fabric, no team logos",
    "Tank top":   "a sleeveless tank top with thin shoulder straps and no sleeves, casual summer wear",
    "Crop top":   "a short crop top shirt cut to expose the midriff, ending well above the waist",
    "Sweater":    "a warm knitted sweater or pullover made of wool or knit fabric, long sleeves",
    "Hoodie":     "a hooded sweatshirt with a hood and a large front kangaroo pocket, casual streetwear",
    "Jeans":      "blue denim jeans pants with stitched pockets and a zipper fly closure",
    "Trousers":   "formal tailored dress trousers or slacks with a pressed crease and belt loops",
    "Skirt":      "a women's skirt, flowing or pleated, worn around the waist and hips",
    "Dress":      "a women's one-piece dress or gown covering the body from shoulder to knee or lower",
    "Sneakers":   "casual athletic sneakers or running shoes with rubber soles and laces",
    "Jacket":     "an outerwear jacket, bomber, harrington, or blazer with a zipper or button front, side hand pockets, and often a ribbed waist hem, worn over a t-shirt or other clothing as an outer layer",
    "Coat":       "a long overcoat or trench coat worn in cold weather, reaching the thigh or knee",
    "Shorts":     "short pants that end above the knee, casual everyday shorts",
    "Hat":        "a hat worn on the head, such as a beanie, bucket hat, or fedora",
    "Cap":        "a baseball cap or snapback hat with a structured front panel and a curved brim",
    "Bag":        "a handbag, shoulder bag, backpack, or purse used for carrying personal items",
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

# Bộ từ điển chuyên ngành thời trang giúp ép máy dịch dịch chuẩn xác các từ lóng
_FASHION_GLOSSARY = {
    "áo hai dây": "camisole",
    "áo 2 dây": "camisole",
    "áo phông": "t-shirt",
    "áo thun": "t-shirt",
    "áo ba lỗ": "tank top",
    "áo sát nách": "sleeveless shirt",
    "áo len": "sweater",
    "váy đầm": "dress",
    "chân váy": "skirt",
    "quần bò": "jeans",
    "quần đùi": "shorts",
    "quần ngố": "shorts",
    "quần âu": "trousers",
    "quần tây": "trousers",
    "áo khoác": "jacket",
    "áo choàng": "coat",
    "giày thể thao": "sneakers",
    "mũ lưỡi trai": "cap",
    "túi xách": "bag",
    "kẻ sọc": "striped",
    "chấm bi": "polka dot",
    "rằn ri": "camouflage",
    "ô vuông": "plaid",
    "cổ lọ": "turtleneck",
    "cổ tim": "v-neck",
    "cổ tròn": "crew neck",
    "có cổ": "collared",
    "không cổ": "collarless",
    "ngắn tay": "short sleeve",
    "dài tay": "long sleeve"
}

# Alias mở rộng cho bộ lọc (Hard Filter). 
# Giá trị value phải khớp chính xác với value trong _ATTRIBUTE_VI_LABELS
_ATTRIBUTE_ALIASES: dict[str, dict[str, str]] = {
    "category": {
        "áo phông": "áo thun", "quần đùi": "quần short", "quần bò": "quần jean",
        "váy xếp cả": "chân váy", "áo 2 dây": "áo ba lỗ", "áo hai dây": "áo ba lỗ",
        "áo sát nách": "áo ba lỗ",
        "sơ mi": "áo sơ mi", "polo": "áo polo", "hoodie": "áo hoodie",
        "croptop": "áo croptop", "sneaker": "giày sneaker"
    },
    "color": {
        "sữa": "be", "trắng ngà": "be", "kem": "be", "vàng chanh": "vàng", "đỏ đô": "đỏ"
    },
    "sleeve": {
        "tay ngắn": "ngắn tay",
        "cộc tay": "ngắn tay",
        "tay dài": "dài tay"
    }
}

# Từ điển Việt hóa cho từng nhãn trong _ATTRIBUTE_VOCAB — dùng để dịch kết quả
# predict_all_attributes_batch() sang tiếng Việt trước khi lưu vào metadata_ai.
# Có thể chỉnh lại chữ cho tự nhiên hơn tùy gu, đây chỉ là bản dịch mặc định hợp lý.
_ATTRIBUTE_VI_LABELS: dict[str, dict[str, str]] = {
    "category": {
        "T-shirt": "áo thun", "Polo shirt": "áo polo", "Shirt": "áo sơ mi", "Jersey": "áo đá bóng", "Activewear shirt": "áo thể thao", "Tank top": "áo ba lỗ", "Crop top": "áo croptop", "Sweater": "áo len", "Hoodie": "áo hoodie", "Jeans": "quần jean", "Trousers": "quần âu",
        "Skirt": "chân váy", "Dress": "váy đầm", "Sneakers": "giày sneaker",
        "Jacket": "áo khoác", "Coat": "áo choàng", "Shorts": "quần short",
        "Hat": "mũ", "Cap": "mũ lưỡi trai", "Bag": "túi xách",
    },
    "color": {
        "Red": "đỏ", "Blue": "xanh dương", "Black": "đen", "White": "trắng",
        "Yellow": "vàng", "Green": "xanh lá", "Pink": "hồng", "Grey": "xám",
        "Brown": "nâu", "Purple": "tím", "Orange": "cam", "Beige": "be",
    },
    "pattern": {
        "Solid": "trơn", "Striped": "sọc", "Plaid": "caro", "Floral": "hoa",
        "Polka dot": "chấm bi", "Graphic print": "in hình", "Camouflage": "rằn ri",
    },
    "style": {
        "Casual": "thường ngày", "Formal": "trang trọng", "Vintage": "cổ điển",
        "Streetwear": "đường phố", "Sportswear": "phong cách thể thao", "Y2K": "phong cách y2k",
        "Minimalist": "tối giản",
    },
    "material": {
        "Denim": "vải bò", "Leather": "da", "Cotton": "cotton", "Wool": "len",
        "Silk": "lụa", "Velvet": "nhung", "Linen": "vải lanh",
    },
    "fit": {
        "Oversized": "rộng (oversize)", "Slim fit": "ôm sát", "Regular fit": "dáng chuẩn",
        "Baggy": "thùng thình", "Skinny": "bó sát",
    },
    "gender": {
        "Mens": "nam", "Womens": "nữ", "Unisex": "unisex", "Kids": "trẻ em",
    },
    "sleeve": {
        "Short sleeve": "ngắn tay", "Long sleeve": "dài tay", "Sleeveless": "sát nách",
    },
    "neckline": {
        "Collared": "có cổ", "Collarless": "không cổ",
    },
    "brand": {
        "Nike": "nike", "Adidas": "adidas", "Gucci": "gucci", "Lacoste": "lacoste", 
        "Chanel": "chanel", "Louis Vuitton": "louis vuitton", "Puma": "puma", 
        "Manchester United": "manchester united", "Burberry": "burberry", "Dior": "dior", 
        "Balenciaga": "balenciaga", "Zara": "zara", "H&M": "h&m", "Unbranded": "không rõ hãng"
    },
    "view_angle": {
        "Front view": "mặt trước", "Back view": "mặt sau", "Side view": "mặt ngang",
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
        # Thay thế từ lóng bằng glossary trước khi đưa vào máy dịch
        for vi_word, en_word in _FASHION_GLOSSARY.items():
            pattern = r'\b' + re.escape(vi_word) + r'\b'
            text = re.sub(pattern, en_word, text, flags=re.IGNORECASE)

        inputs = self.translator_tokenizer(
            [text], return_tensors="pt", padding=True, truncation=True
        ).to(self.device)
        with torch.inference_mode():
            translated_ids = self.translator_model.generate(
                **inputs, max_new_tokens=64, num_beams=1
            )
        return self.translator_tokenizer.batch_decode(translated_ids, skip_special_tokens=True)[0]

    def _precompute_attribute_vocab_vectors(self):
        logger.info("Đang sinh vector mẫu cho 7 nhóm thuộc tính thời trang...")
        for attr_name, labels in _ATTRIBUTE_VOCAB.items():
            if attr_name == "category":
                prompts = [_CATEGORY_PROMPTS.get(label, f"a photo of a {label}") for label in labels]
            else:
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

    # Gắn 7 thuộc tính thời trang cho MỘT vector ảnh (vector đã tính sẵn từ
    # get_image_embedding/get_image_embeddings, không encode lại ảnh).
    def predict_all_attributes(self, image_embedding: list[float]) -> dict:
        return self.predict_all_attributes_batch([image_embedding])[0]

    # Gắn 7 thuộc tính thời trang cho MỘT BATCH vector ảnh cùng lúc (1 phép nhân ma
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

    def add_dynamic_brand(self, new_brand: str):
        """
        Dynamically injects a new brand into the runtime vocabulary dictionaries so that 
        subsequent text queries containing this brand name can be extracted as a hard filter.
        """
        normalized = new_brand.lower()
        if normalized not in _ATTRIBUTE_VI_LABELS["brand"].values():
            _ATTRIBUTE_VI_LABELS["brand"][normalized] = normalized
            if normalized not in _ATTRIBUTE_VOCAB["brand"]:
                _ATTRIBUTE_VOCAB["brand"].append(normalized)

    # Bóc tách thuộc tính xuất hiện trực tiếp trong câu tìm kiếm tiếng Việt, dựa vào
    # so khớp chuỗi con với chính _ATTRIBUTE_VI_LABELS (từ điển này cũng dùng để Việt
    # hóa metadata_ai lúc indexing, nên nhãn khớp ra luôn trùng khớp tuyệt đối với giá
    # trị đã lưu trong Payload/DB).
    # Mỗi nhóm thuộc tính chỉ lấy nhãn khớp DÀI NHẤT (duyệt giảm dần theo độ dài) để
    # tránh nhãn ngắn (vd. "Áo") ăn nhầm vào nhãn dài hơn chứa nó (vd. "Áo thun").
    def extract_tags_from_text(self, text: str) -> dict[str, list[str]]:
        import string
        import unicodedata

        # Chuẩn hoá Unicode NFC: fix lỗi NFC vs NFD mà bàn phím Tiếng Việt (Unikey/MacOS)
        # hay sinh ra - trông giống nhau nhưng bytes khác nhau nên .replace() trượt hoàn toàn.
        normalized = unicodedata.normalize("NFC", text.lower())
        
        # Loại bỏ dấu câu và thêm khoảng trắng 2 đầu để tìm kiếm từ vựng
        clean_text = normalized.translate(str.maketrans('', '', string.punctuation))
        padded = f" {clean_text} "
        
        # Alias Mapping: Đổi các từ lóng thành từ chuẩn trong từ điển VI_LABELS.
        # Cả alias_key và standard_val đều được NFC-normalize khi so khớp.
        for attr_name, aliases in _ATTRIBUTE_ALIASES.items():
            for alias_key, standard_val in aliases.items():
                nfc_key = unicodedata.normalize("NFC", alias_key)
                nfc_val = unicodedata.normalize("NFC", standard_val)
                padded = padded.replace(f" {nfc_key} ", f" {nfc_val} ")
        
        logger.debug(f"[extract_tags] padded after alias: '{padded.strip()}'")

        filters: dict[str, list[str]] = {}
        
        query_words = set(padded.split())

        for attr_name, vi_labels in _ATTRIBUTE_VI_LABELS.items():
            # Gom tất cả nhãn của thuộc tính này lại, ưu tiên nhãn có nhiều từ nhất
            # để tránh nhãn ngắn (vd 'áo') đè nhãn dài (vd 'áo sơ mi')
            sorted_labels = sorted(vi_labels.values(), key=lambda x: len(x.split()), reverse=True)
            
            for vi_label in sorted_labels:
                # BoW Subset Match: Không quan tâm thứ tự từ (tay ngắn == ngắn tay)
                label_words = set(unicodedata.normalize("NFC", vi_label.lower()).split())
                if label_words.issubset(query_words):
                    filters[attr_name] = [vi_label]
                    break
            
            # Double-safety: Nếu BoW trượt (ví dụ do alias), check trực tiếp alias
            if attr_name not in filters and attr_name in _ATTRIBUTE_ALIASES:
                for alias_key, standard_val in _ATTRIBUTE_ALIASES[attr_name].items():
                    alias_words = set(unicodedata.normalize("NFC", alias_key.lower()).split())
                    if alias_words.issubset(query_words):
                        filters[attr_name] = [standard_val]
                        break

        # Xử lý đặc biệt cho màu "xanh" (nếu không gõ rõ xanh lá hay xanh dương)
        if "color" not in filters and " xanh " in padded:
            filters["color"] = ["xanh dương", "xanh lá"]

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
