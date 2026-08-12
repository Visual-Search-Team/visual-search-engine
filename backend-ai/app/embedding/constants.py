import os

# model FashionCLIP
FASHION_CLIP_NAME = "patrickjohncyh/fashion-clip"

# Model dịch máy nhỏ gọn, chạy nội bộ (không gọi API ngoài)
VI_EN_TRANSLATOR_NAME = "Helsinki-NLP/opus-mt-vi-en"

# Thư mục cache model
BASE_MODEL_CACHE = os.environ.get(
    "BASE_MODEL_CACHE",
    os.path.join(os.path.dirname(__file__), "..", "..", "base_model_cache")
)

# 7 kho từ vựng thuộc tính thời trang dùng để gắn tag zero-shot.
ATTRIBUTE_VOCAB: dict[str, list[str]] = {
    "category": ["T-shirt", "Shirt", "Jersey", "Tank top", "Crop top", "Sweater", "Hoodie", "Jeans", "Trousers", "Skirt", "Dress", "Sneakers", "Jacket", "Coat", "Shorts", "Hat", "Cap", "Bag"],
    "color": ["Red", "Blue", "Black", "White", "Yellow", "Green", "Pink", "Grey", "Brown", "Purple", "Orange", "Beige"],
    "pattern": ["Solid", "Striped", "Plaid", "Floral", "Polka dot", "Graphic print", "Camouflage"],
    "style": ["Casual", "Formal", "Vintage", "Streetwear", "Sportswear", "Y2K", "Minimalist"],
    "material": ["Denim", "Leather", "Cotton", "Wool", "Silk", "Velvet", "Linen"],
    "fit": ["Oversized", "Slim fit", "Regular fit", "Baggy", "Skinny"],
    "gender": ["Mens", "Womens", "Unisex", "Kids"],
    "sleeve": ["Short sleeve", "Long sleeve", "Sleeveless"],
    "neckline": ["Collared", "Crew neck", "V-neck", "Turtleneck", "Collarless"],
    "brand": ["Nike", "Adidas", "Gucci", "Lacoste", "Chanel", "Louis Vuitton", "Puma", "Manchester United", "Burberry", "Dior", "Balenciaga", "Zara", "H&M", "Unbranded"],
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
}

# Từ điển Việt hóa cho từng nhãn trong ATTRIBUTE_VOCAB
ATTRIBUTE_VI_LABELS: dict[str, dict[str, str]] = {
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
        "Collared": "Có cổ", "Crew neck": "Cổ tròn", "V-neck": "Cổ tim", "Turtleneck": "Cổ lọ", "Collarless": "Không cổ",
    },
    "brand": {
        "Nike": "Nike", "Adidas": "Adidas", "Gucci": "Gucci", "Lacoste": "Lacoste", 
        "Chanel": "Chanel", "Louis Vuitton": "Louis Vuitton", "Puma": "Puma", 
        "Manchester United": "Manchester United", "Burberry": "Burberry", "Dior": "Dior", 
        "Balenciaga": "Balenciaga", "Zara": "Zara", "H&M": "H&M", "Unbranded": "Không rõ hãng"
    },
}

# Các từ khóa "gốc" của nhóm ngành hàng
BROAD_CATEGORY_KEYWORDS: list[str] = ["áo", "quần", "giày", "mũ", "váy", "túi"]
