import torch
import logging 
import os
import open_clip
import torch.nn.functional as F
from PIL import Image

logger = logging.getLogger(__name__)

# đường dẫn tới các thư mục, cũng như cho docker đọc
_LORA_DIR = os.environ.get(
    "LORA_WEIGHTS_DIR",
    os.path.join(os.path.dirname(__file__),"..","..","Lora_weights")
)

_DENSE_PATH = os.path.join(_LORA_DIR,"dense_weights.pth")

_BASE_MCLIP_NAME = "sentence-transformers/clip-ViT-B-32-multilingual-v1"

_BASE_MODEL_CACHE = os.environ.get(
    "BASE_MODEL_CACHE",
    os.path.join(os.path.dirname(__file__),"..","..","base_model_cache")
)

class CLIPModelWrapper:
    def __init__(self,model_name: str ="ViT-B-32-quickgelu",pretrained: str="openai"):
        self.device ="cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Đang tải model CLIP:{model_name} trên {self.device}")

        # setup cho embedd ảnh 
        model, _, preprocess = open_clip.create_model_and_transforms(model_name,pretrained =pretrained)
        self.model = model.to(self.device).eval()
        self.preprocess = preprocess

        # setup cho embedd text
        self.mclip = None
        self.mclip_tokenizer = None
        self._load_multilingual_text_encoder()

    # Thiết lập cho LoRA và fallback nếu ko ổn
    def _load_multilingual_text_encoder(self):
        lora_dir = os.path.abspath(_LORA_DIR)
        dense_path = os.path.abspath(_DENSE_PATH)
        adapter_path = os.path.join(lora_dir,"adapter_model.safetensors")
        adapter_config = os.path.join(lora_dir,"adapter_config.json")

        # check file
        missing =[]
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

            base_cache = os.path.abspath(_BASE_MODEL_CACHE)
            #check xem đã có cache local chưa
            if os.path.isdir(base_cache) and os.path.exists(os.path.join(base_cache,"sentence_bert_config.json")):
                logger.info(f"Load base model từ cache local: {base_cache}")
                base_mclip = SentenceTransformer(base_cache)
                base_transformer = base_mclip[0].auto_model
            else: # nếu chưa có thì tải về từ huggingFace
                logger.info(f"chưa có model trong cache, tải từ huggingface")
                base_mclip = SentenceTransformer(_BASE_MCLIP_NAME)
                base_transformer = base_mclip[0].auto_model
                os.makedirs(base_cache,exist_ok=True)
                base_mclip.save(base_cache)
                logger.info(f"Đã lưu xong model vào cache")
            
            # Gắn LoRA adapter vào model
            peft_transformer = PeftModel.from_pretrained(
                base_transformer,
                lora_dir,
                is_trainable = False
            )
            base_mclip[0].auto_model = peft_transformer

            # Load Dense Layer đã fine-tune
            logger.info(f"Load file trọng số dense từ: {dense_path}")
            dense_state = torch.load(dense_path,map_location = self.device,weights_only=True)
            base_mclip[2].load_state_dict(dense_state)

            self.mclip = base_mclip.to(self.device).eval()
            self.mclip_tokenizer = self.mclip[0].tokenizer
            logger.info(f"Load thành công mô hình để phục vụ text-encode")

        except Exception as e:
            logger.error(f"Lỗi khi load Multilingual Text Encoder :{e}",exc_info=True)
            logger.warning(f"Fallback về CLIP text encoder")
            self.tokenizer = open_clip.get_tokenizer("ViT-B-32-quickgelu")
            self.mclip = None

    # Trích xuất vector đặc trưng từ 1 ảnh 
    def get_image_embedding(self,img: Image.Image) -> list[float]:
        img_t = self.preprocess(img).unsqueeze(0).to(self.device)
        with torch.inference_mode():
            feat = self.model.encode_image(img_t)
            feat = F.normalize(feat,dim =-1)
        return feat.cpu().numpy()[0].tolist()
    
    # Trích xuất vector đặc trưng từ nhiều ảnh (theo batch)
    def get_image_embeddings(self,imgs: list[Image.Image]) -> list[list[float]]:
        if not imgs:
            return []
        img_tensors =[self.preprocess(img) for img in imgs]
        batch_t = torch.stack(img_tensors).to(self.device)
        with torch.inference_mode():
            feat = self.model.encode_image(batch_t)
            feat = F.normalize(feat,dim=-1)
        return feat.cpu().numpy().tolist()
    
    # Trích xuất vector đặc trưng từ text được nhập
    def get_text_embedding(self,text: str) -> list[float]:
        if self.mclip is not None:
            with torch.inference_mode():
                text_inputs = self.mclip_tokenizer(
                    [text],
                    padding = True,
                    truncation = True,
                    max_length =77,
                    return_tensors ="pt"
                )
                text_inputs ={k: v.to(self.device) for k,v in text_inputs.items()}

                features = dict(text_inputs)
                for module in self.mclip:
                    features = module(features)
                
                feat = features["sentence_embedding"]
                feat = F.normalize(feat,dim=-1)
            return feat.cpu().numpy()[0].tolist()
        else: # fallback về CLIP gốc
            text_tokens = self.tokenizer([text]).to(self.device)
            with torch.inference_mode():
                feat = self.model.encode_text(text_tokens)
                feat = F.normalize(feat,dim=-1)
            return feat.cpu().numpy()[0].tolist()
    
clip_model = CLIPModelWrapper()