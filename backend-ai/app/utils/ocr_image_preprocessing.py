import cv2
import numpy as np
from dataclasses import dataclass, field
from enum import Enum


class ImageCategory(str, Enum):
    DOCUMENT = "document"      # giấy tờ, hóa đơn chụp thẳng
    SCENE = "scene"            # biển hiệu, ảnh tự nhiên
    LOW_RES = "low_res"        # ảnh mờ/nhỏ
    SKEWED = "skewed"          # ảnh nghiêng nhiều


@dataclass
class PreprocessConfig:
    denoise: bool = False
    clahe: bool = False
    deskew: bool = False
    sharpen: bool = False
    upscale_factor: float = 1.0
    binarize: bool = False


# Config mặc định theo từng loại ảnh — dễ mở rộng/so sánh sau này
CATEGORY_CONFIGS: dict[ImageCategory, PreprocessConfig] = {
    ImageCategory.DOCUMENT: PreprocessConfig(deskew=True, binarize=True, clahe=True),
    ImageCategory.SCENE: PreprocessConfig(denoise=True, clahe=True),
    ImageCategory.LOW_RES: PreprocessConfig(upscale_factor=2.0, sharpen=True),
    ImageCategory.SKEWED: PreprocessConfig(deskew=True),
}


def denoise(image: np.ndarray) -> np.ndarray:
    return cv2.fastNlMeansDenoisingColored(image, None, 10, 10, 7, 21)


def apply_clahe(image: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    merged = cv2.merge((l, a, b))
    return cv2.cvtColor(merged, cv2.COLOR_LAB2RGB)


def deskew(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 100, minLineLength=100, maxLineGap=10)
    if lines is None:
        return image
    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        if abs(angle) < 45:
            angles.append(angle)
    if not angles:
        return image
    median_angle = np.median(angles)
    h, w = image.shape[:2]
    matrix = cv2.getRotationMatrix2D((w / 2, h / 2), median_angle, 1)
    return cv2.warpAffine(image, matrix, (w, h), borderMode=cv2.BORDER_REPLICATE)


def sharpen(image: np.ndarray) -> np.ndarray:
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    return cv2.filter2D(image, -1, kernel)


def resize_image(image: np.ndarray, config: PreprocessConfig) -> np.ndarray:
    h, w = image.shape[:2]
    max_size = 1024
    
    # 1. Tính toán kích thước dự kiến sau khi upscale
    new_w = int(w * config.upscale_factor)
    new_h = int(h * config.upscale_factor)
    
    # 2. Giới hạn kích thước tối đa để tránh OOM GPU
    if max(new_w, new_h) > max_size:
        ratio = max_size / max(new_w, new_h)
        new_w = int(new_w * ratio)
        new_h = int(new_h * ratio)
        
    if (new_w, new_h) == (w, h):
        return image
        
    # Chọn thuật toán nội suy phù hợp
    interpolation = cv2.INTER_AREA if new_w < w else cv2.INTER_CUBIC
    return cv2.resize(image, (new_w, new_h), interpolation=interpolation)


def binarize(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15
    )
    return cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)


def preprocess_image(image: np.ndarray, config: PreprocessConfig) -> np.ndarray:
    """Áp dụng các bước tiền xử lý theo config, thứ tự có ý nghĩa."""
    result = image
    if config.denoise:
        result = denoise(result)
    if config.deskew:
        result = deskew(result)
    if config.clahe:
        result = apply_clahe(result)
    # Gom chung bước upscale và downscale
    result = resize_image(result, config)
    if config.sharpen:
        result = sharpen(result)
    if config.binarize:
        result = binarize(result)
    return result

FALLBACK_CONFIG = PreprocessConfig(
    upscale_factor=2.0, 
    binarize=True, 
    sharpen=True, 
    deskew=True
)