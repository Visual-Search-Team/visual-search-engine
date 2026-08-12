import cv2
import numpy as np
import logging
from PIL import Image
from rembg import remove, new_session
import os
from skimage.color import rgb2lab, deltaE_ciede2000

logger = logging.getLogger(__name__)

# Bảng 12 màu cơ bản tương ứng với FashionCLIP
# Bổ sung nhiều điểm neo (centroids) cho mỗi màu để bao phủ các sắc độ thực tế
_BASE_COLORS = {
    "Red": [(220, 20, 30), (139, 0, 0), (255, 50, 50)], 
    "Blue": [(20, 50, 180), (0, 0, 128), (135, 206, 235)],
    "Black": [(0, 0, 0), (40, 40, 40)],
    "White": [(255, 255, 255), (240, 240, 240)],
    "Yellow": [(255, 255, 0), (255, 215, 0), (218, 165, 32)],
    "Green": [(0, 128, 0), (34, 139, 34), (144, 238, 144), (0, 100, 0)],
    "Pink": [(255, 192, 203), (255, 105, 180), (219, 112, 147)],
    "Grey": [(128, 128, 128), (169, 169, 169), (105, 105, 105), (192, 192, 192)],
    "Brown": [(139, 69, 19), (160, 82, 45), (205, 133, 63), (101, 67, 33)],
    "Purple": [(128, 0, 128), (147, 112, 219), (75, 0, 130), (221, 160, 221)],
    "Orange": [(255, 165, 0), (255, 140, 0), (255, 127, 80)],
    "Beige": [(245, 245, 220), (255, 250, 205), (255, 228, 196), (238, 213, 183)],
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
        
        # Sử dụng u2netp (bản siêu nhẹ 4.7MB) thay cho u2net để tăng tốc độ trên CPU
        self.rembg_session = new_session("u2netp")
        
        # Chuyển đổi bảng màu sang LAB không gian
        self._lab_colors = {}
        for name, rgb_list in _BASE_COLORS.items():
            lab_list = []
            for rgb in rgb_list:
                rgb_np = np.uint8([[[rgb[0], rgb[1], rgb[2]]]])
                lab_np = rgb2lab(rgb_np)
                lab_list.append(lab_np[0][0])
            self._lab_colors[name] = lab_list
            
        logger.info("DominantColorExtractor initialized.")

    def _rgb_to_color_name(self, lab_val: np.ndarray) -> str:
        """Map mã LAB về màu có sẵn gần nhất trong bảng 12 màu."""
        min_dist = float('inf')
        closest_color = None
        
        for name, lab_list in self._lab_colors.items():
            for base_lab in lab_list:
                # Sử dụng CIEDE2000 thay vì Euclidean distance
                dist = deltaE_ciede2000(lab_val, base_lab)
                if dist < min_dist:
                    min_dist = dist
                    closest_color = name
                    
        return closest_color

    def get_dominant_colors(self, img: Image.Image, k: int = 5, top_n: int = 3) -> list[dict]:
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
            
            # Khử viền (Halo Effect) do tách nền bằng Erosion
            mask_uint8 = mask.astype(np.uint8) * 255
            kernel = np.ones((3, 3), np.uint8)
            eroded_mask = cv2.erode(mask_uint8, kernel, iterations=1)
            mask = eroded_mask > 128
            
            fg_pixels_rgba = masked_img[mask]
            
            # Nếu không tìm thấy vật thể nào (hoặc quá nhỏ), fallback về ảnh gốc không mask
            if len(fg_pixels_rgba) < 100:
                fg_pixels_rgb = img_np.reshape(-1, 3)
            else:
                fg_pixels_rgb = fg_pixels_rgba[:, :3]
                
            # 4. Chuyển sang LAB không gian
            fg_pixels_rgb_reshaped = fg_pixels_rgb.reshape(1, -1, 3)
            # Dùng skimage rgb2lab thay vì cv2.cvtColor
            fg_pixels_lab = rgb2lab(fg_pixels_rgb_reshaped)
            fg_pixels_lab = fg_pixels_lab.reshape(-1, 3)
            
            # Lọc các dải màu phi thực tế (Shadows & Highlights)
            # Chỉ giữ lại các pixel có 15 < L < 95
            l_channel = fg_pixels_lab[:, 0]
            valid_idx = (l_channel > 15) & (l_channel < 95)
            fg_pixels_lab_filtered = fg_pixels_lab[valid_idx]
            
            # Nếu lọc xong mà mất hết pixel (ví dụ toàn đen kịt), fallback về chưa lọc
            if len(fg_pixels_lab_filtered) < 50:
                fg_pixels_lab_filtered = fg_pixels_lab
            
            # 5. K-Means
            # Chuyển dữ liệu sang float32 cho K-Means
            pixels_f32 = np.float32(fg_pixels_lab_filtered)
            
            criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
            
            # cv2.kmeans trả về: compact, labels, centers
            _, labels, centers = cv2.kmeans(
                pixels_f32, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS
            )
            
            # Tính phần trăm số lượng pixel mỗi cụm
            labels = labels.flatten()
            counts = np.bincount(labels, minlength=k)
            total = len(labels)
            
            # Lọc và lấy thông tin các cụm
            clusters = []
            for i in range(k):
                if counts[i] > 0:
                    pct = counts[i] / total
                    color_name = self._rgb_to_color_name(centers[i])
                    clusters.append({
                        "percent": pct,
                        "name": color_name
                    })
                    
            # GỘP CÁC CỤM TRÙNG MÀU
            # K-Means có thể chia áo màu Xanh dương thành 3 cụm Xanh dương khác nhau (đậm, nhạt).
            # Ta cần cộng dồn phần trăm của chúng lại trước khi xếp hạng!
            aggregated_colors = {}
            for cl in clusters:
                name = cl["name"]
                if name not in aggregated_colors:
                    aggregated_colors[name] = 0.0
                aggregated_colors[name] += cl["percent"]
                
            final_colors = [{"name": k, "percent": float(v)} for k, v in aggregated_colors.items()]
            
            # 7. Tính điểm (Weighted Scoring)
            for c in final_colors:
                weight = 1.0 if c["name"] in ["Black", "White", "Grey"] else 1.5
                c["score"] = c["percent"] * weight
                
            # Sắp xếp theo điểm giảm dần
            final_colors.sort(key=lambda x: x["score"], reverse=True)
            
            # Nếu mảng rỗng, trả về fallback
            if not final_colors:
                return [{"name": "White", "percent": 1.0}]
                
            # Linh hoạt số lượng màu trả về
            # Nếu màu top 1 chiếm > 85%, chỉ trả về 1 màu
            if final_colors[0]["percent"] > 0.85:
                return [final_colors[0]]
                
            # Nếu không, trả về các màu từ top 2 trở đi nếu tỷ lệ của nó > 15% (hoặc giới hạn top_n)
            filtered_colors = [final_colors[0]]
            for c in final_colors[1:]:
                if c["percent"] > 0.15:
                    filtered_colors.append(c)
                    
            return filtered_colors[:top_n]
            
        except Exception as e:
            logger.error(f"Error in dominant color extraction: {e}")
            return [{"name": "White", "percent": 1.0}] # Fallback an toàn

color_extractor = DominantColorExtractor()
