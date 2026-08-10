import cv2
import numpy as np
import logging
from PIL import Image
from rembg import remove, new_session
import os

logger = logging.getLogger(__name__)

# Bảng 12 màu cơ bản tương ứng với FashionCLIP
_BASE_COLORS = {
    "Red": (255, 0, 0),
    "Blue": (0, 0, 255),
    "Black": (0, 0, 0),
    "White": (255, 255, 255),
    "Yellow": (255, 255, 0),
    "Green": (0, 128, 0),
    "Pink": (255, 192, 203),
    "Grey": (128, 128, 128),
    "Brown": (165, 42, 42),
    "Purple": (128, 0, 128),
    "Orange": (255, 165, 0),
    "Beige": (245, 245, 220),
}

class DominantColorExtractor:
    def __init__(self):
        logger.info("Initializing DominantColorExtractor...")
        
        # Load rembg session
        cache_dir = os.environ.get(
            "BASE_MODEL_CACHE",
            os.path.join(os.path.dirname(__file__), "..", "..", "base_model_cache")
        )
        os.environ["U2NET_HOME"] = cache_dir # Để rembg lưu model u2net vào cache dir chung
        
        # u2net là model mặc định của rembg, rất nhẹ và xử lý tách viền áo tốt
        self.rembg_session = new_session("u2net")
        
        # Chuyển đổi bảng màu sang LAB không gian
        self._lab_colors = {}
        for name, rgb in _BASE_COLORS.items():
            # RGB cần có shape (1, 1, 3) dạng uint8 để convert sang LAB
            rgb_np = np.uint8([[list(rgb)]])
            lab_np = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2LAB)
            self._lab_colors[name] = lab_np[0][0]
            
        logger.info("DominantColorExtractor initialized.")

    def _rgb_to_color_name(self, lab_val: np.ndarray) -> str:
        """Map mã LAB về màu có sẵn gần nhất trong bảng 12 màu."""
        min_dist = float('inf')
        closest_color = None
        
        for name, base_lab in self._lab_colors.items():
            # Khoảng cách Euclidean trong không gian LAB rất sát với mắt người
            dist = np.linalg.norm(lab_val - base_lab)
            if dist < min_dist:
                min_dist = dist
                closest_color = name
                
        return closest_color

    def get_dominant_colors(self, img: Image.Image, k: int = 5, top_n: int = 2) -> list[str]:
        """
        Trích xuất top_n màu chủ đạo của ảnh bằng K-Means trên LAB space sau khi tách nền.
        """
        try:
            # 1. Resize ảnh xuống nhỏ (150x150) để tăng tốc độ tối đa
            # Dùng cv2.INTER_AREA rất tốt để scale down mà vẫn giữ màu tốt
            img_resized = img.copy()
            img_resized.thumbnail((150, 150))
            
            # Chuyển PIL Image sang Numpy RGB
            img_np = np.array(img_resized)
            
            # 2. Tách nền bằng rembg
            # Trả về ảnh có channel Alpha
            masked_img = remove(img_np, session=self.rembg_session)
            
            # 3. Lấy các pixel thuộc vật thể (Alpha > 128)
            alpha_channel = masked_img[:, :, 3]
            mask = alpha_channel > 128
            
            fg_pixels_rgba = masked_img[mask]
            
            # Nếu không tìm thấy vật thể nào (hoặc quá nhỏ), fallback về ảnh gốc không mask
            if len(fg_pixels_rgba) < 100:
                fg_pixels_rgb = img_np.reshape(-1, 3)
            else:
                fg_pixels_rgb = fg_pixels_rgba[:, :3]
                
            # 4. Chuyển sang LAB không gian
            # fg_pixels_rgb có dạng (N, 3), cvtColor yêu cầu ảnh 2D (H, W, 3)
            # nên ta reshape thành (1, N, 3)
            fg_pixels_rgb_reshaped = fg_pixels_rgb.reshape(1, -1, 3)
            fg_pixels_lab = cv2.cvtColor(fg_pixels_rgb_reshaped, cv2.COLOR_RGB2LAB)
            fg_pixels_lab = fg_pixels_lab.reshape(-1, 3)
            
            # 5. K-Means
            # Chuyển dữ liệu sang float32 cho K-Means
            pixels_f32 = np.float32(fg_pixels_lab)
            
            criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
            
            # cv2.kmeans trả về: compact, labels, centers
            _, labels, centers = cv2.kmeans(
                pixels_f32, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS
            )
            
            # Tính phần trăm số lượng pixel mỗi cụm
            labels = labels.flatten()
            counts = np.bincount(labels, minlength=k)
            total = len(labels)
            
            # Lọc và sắp xếp các cụm
            clusters = []
            for i in range(k):
                if counts[i] > 0:
                    pct = counts[i] / total
                    clusters.append({
                        "percent": pct,
                        "lab": centers[i]
                    })
                    
            # Sắp xếp theo tỷ lệ giảm dần
            clusters.sort(key=lambda x: x["percent"], reverse=True)
            
            # 6. Map về tên màu và trả về
            result_colors = []
            for cl in clusters:
                color_name = self._rgb_to_color_name(cl["lab"])
                # Tránh lặp màu trong kết quả (vd: 2 cụm khác nhau cùng map về "Blue")
                if color_name not in result_colors:
                    result_colors.append(color_name)
                    
                if len(result_colors) >= top_n:
                    break
                    
            return result_colors if result_colors else ["White"] # Fallback an toàn
            
        except Exception as e:
            logger.error(f"Error in dominant color extraction: {e}")
            return ["White"] # Fallback an toàn

color_extractor = DominantColorExtractor()
