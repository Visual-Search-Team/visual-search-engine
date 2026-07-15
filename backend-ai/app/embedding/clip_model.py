import os
import torch
import torch.nn.functional as F
from PIL import Image
import open_clip
import logging

logger = logging.getLogger(__name__)

# =========================================================
# Đường dẫn tới thư mục chứa file trọng số LoRA
# Cấu trúc thư mục cần có:
#   adapter_config.json      (cấu hình PEFT/LoRA)
#   adapter_model.safetensors (trọng số LoRA, ~2MB)
#   dense_weights.pth         (trọng số Dense 768->512, ~1.5MB)
#
# Trong Docker: mount qua volume, trỏ bằng env LORA_WEIGHTS_DIR
# Khi dev local: mặc định đọc từ ../../Lora_weights (tương đối với file này)
# =========================================================
_LORA_DIR = os.environ.get(
    "LORA_WEIGHTS_DIR",
    os.path.join(os.path.dirname(__file__), "..", "..", "Lora_weights")
)
_DENSE_PATH = os.path.join(_LORA_DIR, "dense_weights.pth")

# Tên base model trên HuggingFace (dùng để clone về local)
_BASE_MCLIP_NAME = "sentence-transformers/clip-ViT-B-32-multilingual-v1"

# Đường dẫn local để cache base model (tránh tải lại mỗi lần khởi động)
_BASE_MODEL_CACHE = os.environ.get(
    "BASE_MODEL_CACHE",
    os.path.join(os.path.dirname(__file__), "..", "..", "base_model_cache")
)


class CLIPModelWrapper:
    def __init__(self, model_name: str = "ViT-B-32-quickgelu", pretrained: str = "openai"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading CLIP model {model_name} on {self.device}...")

        # ── Image Encoder (CLIP ViT-B-32, đóng băng hoàn toàn) ──────────
        model, _, preprocess = open_clip.create_model_and_transforms(model_name, pretrained=pretrained)
        self.model = model.to(self.device).eval()
        self.preprocess = preprocess

        # ── Text Encoder đa ngữ (mCLIP + LoRA fine-tuned) ────────────────
        self.mclip = None
        self.mclip_tokenizer = None
        self._load_multilingual_text_encoder()

        logger.info("CLIP model loaded successfully.")

    def _load_multilingual_text_encoder(self):
        """
        Tải Multilingual Text Encoder đã LoRA fine-tune.

        Cơ chế:
          1. Load base model DistilBERT multilingual từ local cache hoặc HuggingFace.
          2. Gắn LoRA adapter (adapter_model.safetensors) vào base model.
          3. Load trọng số Dense layer (dense_weights.pth).
          4. Nếu có bất kỳ lỗi nào → fallback về CLIP tiếng Anh gốc.
        """
        lora_dir = os.path.abspath(_LORA_DIR)
        dense_path = os.path.abspath(_DENSE_PATH)
        adapter_path = os.path.join(lora_dir, "adapter_model.safetensors")
        adapter_config = os.path.join(lora_dir, "adapter_config.json")

        # Kiểm tra file bắt buộc
        missing = []
        if not os.path.isdir(lora_dir):
            missing.append(f"thư mục {lora_dir}")
        if not os.path.exists(adapter_config):
            missing.append("adapter_config.json")
        if not os.path.exists(adapter_path):
            missing.append("adapter_model.safetensors")
        if not os.path.exists(dense_path):
            missing.append("dense_weights.pth")

        if missing:
            logger.warning(f"Thiếu: {', '.join(missing)}. Fallback về CLIP tiếng Anh.")
            self.tokenizer = open_clip.get_tokenizer("ViT-B-32-quickgelu")
            return

        try:
            from sentence_transformers import SentenceTransformer
            from transformers import AutoModel
            from peft import PeftModel

            # ── Bước 1: Load base model ────────────────────────────────────
            base_cache = os.path.abspath(_BASE_MODEL_CACHE)

            if os.path.isdir(base_cache) and os.path.exists(os.path.join(base_cache, "sentence_bert_config.json")):
                # Đã có cache local → load offline, nhanh hơn
                logger.info(f"Load base model từ cache local: {base_cache}")
                base_mclip = SentenceTransformer(base_cache)
                base_transformer = base_mclip[0].auto_model
            else:
                # Chưa có cache → tải từ HuggingFace
                logger.info("=" * 60)
                logger.info(f"⬇️  ĐANG TẢI BASE MODEL TỪ HUGGINGFACE...")
                logger.info(f"   Model: {_BASE_MCLIP_NAME}")
                logger.info(f"   Kích thước: ~500MB — vui lòng chờ...")
                logger.info("=" * 60)
                base_mclip = SentenceTransformer(_BASE_MCLIP_NAME)
                base_transformer = base_mclip[0].auto_model
                logger.info("✅ Tải model xong!")

                # Lưu TOÀN BỘ SentenceTransformer (bao gồm tokenizer, pooling, dense)
                logger.info(f"💾 Đang lưu cache vào: {base_cache} ...")
                os.makedirs(base_cache, exist_ok=True)
                base_mclip.save(base_cache)
                logger.info(f"✅ Đã lưu cache xong! Lần sau sẽ load nhanh hơn.")

            # ── Bước 2: Gắn LoRA adapter vào base model ──────────────────
            logger.info(f"Gắn LoRA adapter từ: {lora_dir}")
            peft_transformer = PeftModel.from_pretrained(
                base_transformer,
                lora_dir,
                is_trainable=False   # inference mode, không cần gradient
            )

            # Thay thế transformer bên trong SentenceTransformer bằng bản LoRA
            base_mclip[0].auto_model = peft_transformer

            # ── Bước 3: Load Dense layer đã fine-tune ──────────────────────
            logger.info(f"Load dense_weights.pth từ: {dense_path}")
            dense_state = torch.load(dense_path, map_location=self.device, weights_only=True)
            base_mclip[2].load_state_dict(dense_state)

            # ── Bước 4: Chuyển toàn bộ sang device và eval mode ───────────
            self.mclip = base_mclip.to(self.device).eval()
            self.mclip_tokenizer = self.mclip[0].tokenizer

            lora_size_mb = os.path.getsize(adapter_path) / (1024 * 1024)
            logger.info(f"✅ Multilingual Text Encoder loaded thành công!")
            logger.info(f"   LoRA adapter size: {lora_size_mb:.1f} MB")
            logger.info(f"   Hỗ trợ: Tiếng Việt + Tiếng Anh + 50+ ngôn ngữ khác")

        except Exception as e:
            logger.error(f"Lỗi khi load Multilingual Text Encoder: {e}", exc_info=True)
            logger.warning("Fallback về CLIP Text Encoder tiếng Anh gốc.")
            self.tokenizer = open_clip.get_tokenizer("ViT-B-32-quickgelu")
            self.mclip = None

    def get_image_embedding(self, img: Image.Image) -> list[float]:
        """Trích xuất vector đặc trưng từ ảnh (Image Encoder CLIP, 512 chiều)."""
        img_t = self.preprocess(img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            feat = self.model.encode_image(img_t)
            feat = F.normalize(feat, dim=-1)
        return feat.cpu().numpy()[0].tolist()

    def get_text_embedding(self, text: str) -> list[float]:
        """
        Trích xuất vector đặc trưng từ văn bản (512 chiều).
        - Nếu LoRA đã load: dùng mCLIP đa ngữ (tiếng Việt, Anh, 50+ ngôn ngữ).
        - Nếu không: fallback về CLIP tiếng Anh gốc.
        """
        if self.mclip is not None:
            # === Multilingual Text Encoder (LoRA fine-tuned mCLIP) ===
            with torch.no_grad():
                text_inputs = self.mclip_tokenizer(
                    [text],
                    padding=True,
                    truncation=True,
                    max_length=77,
                    return_tensors="pt"
                )
                text_inputs = {k: v.to(self.device) for k, v in text_inputs.items()}

                # Forward qua pipeline của SentenceTransformer
                features = dict(text_inputs)
                for module in self.mclip:
                    features = module(features)

                feat = features["sentence_embedding"]
                feat = F.normalize(feat, dim=-1)
            return feat.cpu().numpy()[0].tolist()
        else:
            # === Fallback: CLIP gốc (English only) ===
            text_tokens = self.tokenizer([text]).to(self.device)
            with torch.no_grad():
                feat = self.model.encode_text(text_tokens)
                feat = F.normalize(feat, dim=-1)
            return feat.cpu().numpy()[0].tolist()


# Singleton — khởi tạo 1 lần duy nhất, dùng chung toàn ứng dụng
clip_model = CLIPModelWrapper()
