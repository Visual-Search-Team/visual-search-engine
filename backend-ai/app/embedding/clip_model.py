import torch
import torch.nn.functional as F
from PIL import Image
import open_clip
import logging

logger = logging.getLogger(__name__)

class CLIPModelWrapper:
    def __init__(self, model_name: str = "ViT-B-32-quickgelu", pretrained: str = "openai"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading CLIP model {model_name} on {self.device}...")
        
        # Load model and preprocess
        model, _, preprocess = open_clip.create_model_and_transforms(model_name, pretrained=pretrained)
        self.model = model.to(self.device).eval()
        self.preprocess = preprocess
        self.tokenizer = open_clip.get_tokenizer(model_name)
        
        logger.info("CLIP model loaded successfully.")

    def get_image_embedding(self, img: Image.Image) -> list[float]:
        img_t = self.preprocess(img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            feat = self.model.encode_image(img_t)
            feat = F.normalize(feat, dim=-1)
        return feat.cpu().numpy()[0].tolist()

    def get_text_embedding(self, text: str) -> list[float]:
        text_tokens = self.tokenizer([text]).to(self.device)
        with torch.no_grad():
            feat = self.model.encode_text(text_tokens)
            feat = F.normalize(feat, dim=-1)
        return feat.cpu().numpy()[0].tolist()

# Instantiate a singleton for application-wide use
clip_model = CLIPModelWrapper()
