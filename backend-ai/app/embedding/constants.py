import os
import re

# model FashionCLIP
FASHION_CLIP_NAME = "patrickjohncyh/fashion-clip"

# Thư mục cache model, tránh phải tải lại mỗi lần build docker
BASE_MODEL_CACHE = os.environ.get(
    "BASE_MODEL_CACHE",
    os.path.join(os.path.dirname(__file__), "..", "..", "base_model_cache")
)

# Model dịch máy nhỏ gọn, chạy nội bộ
VI_EN_TRANSLATOR_NAME = "Helsinki-NLP/opus-mt-vi-en"

# Nhận diện nhanh câu có khả năng là tiếng Việt hay không
VIETNAMESE_CHARS_PATTERN = re.compile(
    r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]",
    re.IGNORECASE,
)

def looks_vietnamese(text: str) -> bool:
    return bool(VIETNAMESE_CHARS_PATTERN.search(text))

# 7 kho từ vựng thuộc tính thời trang dùng để gắn tag zero-shot.
ATTRIBUTE_VOCAB: dict[str, list[str]] = {
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

# Prompt template riêng cho từng nhóm
ATTRIBUTE_PROMPT_TEMPLATES: dict[str, str] = {
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

# Prompt mô tả chi tiết riêng cho từng loại category
CATEGORY_PROMPTS: dict[str, str] = {
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

# Bộ từ điển chuyên ngành thời trang giúp ép máy dịch dịch chuẩn xác các từ lóng
FASHION_GLOSSARY = {
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
ATTRIBUTE_ALIASES: dict[str, dict[str, str]] = {
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

# Từ điển Việt hóa cho từng nhãn trong ATTRIBUTE_VOCAB
ATTRIBUTE_VI_LABELS: dict[str, dict[str, str]] = {
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

# Các từ khóa "gốc" của nhóm ngành hàng
BROAD_CATEGORY_KEYWORDS: list[str] = ["áo", "quần", "giày", "mũ", "váy", "túi"]
