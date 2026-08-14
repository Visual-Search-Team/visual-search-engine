"""
LLM Intent Parser — Tầng Fallback Ngữ Nghĩa
=============================================
Module này chỉ được gọi khi Tầng 1 (Rule-based NLP) thất bại, tức là
người dùng nhập câu trừu tượng như "phong cách old money", "đồ đi biển",
"đồ hẹn hò" mà hệ thống không bóc tách được danh mục cụ thể nào.

Gemini sẽ đọc câu của người dùng và suy luận ra một bộ filter JSON
phù hợp với kho từ vựng của hệ thống, sau đó trả về để tích hợp vào
luồng tìm kiếm Qdrant.
"""

import json
import logging
import os
import re
import unicodedata
from functools import lru_cache

import google.generativeai as genai

logger = logging.getLogger(__name__)

# Kho từ vựng hợp lệ (tiếng Việt) mà Gemini được phép dùng để điền vào filter.
# Phải khớp 100% với _ATTRIBUTE_VI_LABELS trong clip_model.py để tránh ảo giác.
_VALID_VOCAB = {
    "category": [
        "áo thun", "áo polo", "áo sơ mi", "áo đá bóng", "áo thể thao",
        "áo ba lỗ", "áo croptop", "áo len", "áo hoodie", "áo khoác",
        "áo choàng", "đồ vest", "áo dài", "váy đầm", "váy đầm ngủ",
        "chân váy", "quần jean", "quần âu", "quần short",
        "giày sneaker", "mũ", "mũ lưỡi trai", "túi xách"
    ],
    "color": [
        "đỏ", "xanh dương", "đen", "trắng", "vàng", "xanh lá",
        "hồng", "xám", "nâu", "tím", "cam", "be"
    ],
    "style": [
        "thường ngày", "trang trọng", "cổ điển", "đường phố",
        "phong cách thể thao", "phong cách y2k", "tối giản"
    ],
    "pattern": [
        "trơn", "sọc", "caro", "hoa", "chấm bi", "in hình", "rằn ri"
    ],
}

# System Prompt cứng, ép Gemini phải trả về JSON hợp lệ với từ vựng của hệ thống.
_SYSTEM_PROMPT = f"""Bạn là một chuyên gia tư vấn thời trang chuyên về thời trang nam nữ Việt Nam.
Nhiệm vụ của bạn là đọc cụm từ tìm kiếm của người dùng (có thể là phong cách, dịp lễ, xu hướng)
và suy luận ra những loại quần áo phù hợp nhất.

Chỉ được dùng các giá trị có trong từ điển sau:
- category: {_VALID_VOCAB["category"]}
- color: {_VALID_VOCAB["color"]}
- style: {_VALID_VOCAB["style"]}
- pattern: {_VALID_VOCAB["pattern"]}

QUAN TRỌNG:
- Trả về ĐÚNG định dạng JSON, không có markdown, không có giải thích.
- Mỗi key là một mảng các giá trị (có thể nhiều hơn 1 category nếu phong cách đó có nhiều loại áo phù hợp).
- Chỉ tập trung SUY LUẬN THỂ LOẠI (category) và PHONG CÁCH (style). TUYỆT ĐỐI KHÔNG tự bịa ra hoặc ép buộc màu sắc (color) hay họa tiết (pattern) để tránh làm hẹp kết quả tìm kiếm.
- Nếu câu tìm kiếm không liên quan đến thời trang, trả về: {{}}

Ví dụ:
- Input: "phong cách old money nam"
- Output: {{"category": ["áo sơ mi", "áo polo", "đồ vest", "quần âu"], "style": ["trang trọng", "cổ điển"]}}

- Input: "đồ đi biển nữ"
- Output: {{"category": ["váy đầm", "áo ba lỗ", "quần short", "áo croptop"]}}

- Input: "phong cách dark academia"
- Output: {{"category": ["áo len", "áo sơ mi", "đồ vest", "áo khoác"], "style": ["cổ điển", "trang trọng"]}}
"""


@lru_cache(maxsize=1)
def _get_gemini_model():
    """Khởi tạo model Gemini 1 lần duy nhất, cache lại dùng cho các lần sau."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("Biến môi trường GEMINI_API_KEY chưa được thiết lập.")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=_SYSTEM_PROMPT,
    )
    logger.info("[LLM] Gemini model đã được khởi tạo thành công.")
    return model


def _normalize_vi(text: str) -> str:
    return unicodedata.normalize("NFC", text.strip().lower())


def _validate_filter_values(raw_filters: dict) -> dict[str, list[str]]:
    """
    Kiểm tra và lọc bỏ các giá trị mà Gemini bịa ra (không có trong _VALID_VOCAB).
    Bước này là bộ chặn cuối cùng, tránh Gemini ảo giác trả về từ không có trong DB.
    """
    validated: dict[str, list[str]] = {}
    for key, values in raw_filters.items():
        if key not in _VALID_VOCAB:
            continue
        valid_values = _VALID_VOCAB[key]
        valid_set = {_normalize_vi(v) for v in valid_values}
        # Map lại từ giá trị đã normalize về giá trị chuẩn trong từ điển
        norm_to_std = {_normalize_vi(v): v for v in valid_values}
        accepted = []
        for val in values:
            norm_val = _normalize_vi(val)
            if norm_val in valid_set:
                accepted.append(norm_to_std[norm_val])
        if accepted:
            validated[key] = accepted
    return validated


async def parse_fashion_intent(query_text: str) -> dict[str, list[str]]:
    """
    Gọi Gemini để suy luận ngữ nghĩa từ câu tìm kiếm trừu tượng.
    Trả về dict filter hợp lệ, hoặc dict rỗng nếu thất bại (fallback về CLIP thuần).

    Args:
        query_text: Câu tìm kiếm gốc của người dùng (tiếng Việt).

    Returns:
        dict như {"category": ["áo sơ mi", "áo polo"], "style": ["trang trọng"]}
    """
    try:
        model = _get_gemini_model()
    except EnvironmentError as e:
        logger.warning(f"[LLM] Bỏ qua Fallback: {e}")
        return {}

    try:
        logger.info(f"[LLM] Gọi Gemini để suy luận intent cho: '{query_text}'")
        response = await model.generate_content_async(query_text)
        raw_text = response.text.strip()
        logger.info(f"[LLM] Gemini phản hồi: {raw_text}")

        # Gemini có thể bọc JSON trong ```json ... ```, dùng regex để bóc ra
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if not match:
            logger.warning("[LLM] Gemini không trả về JSON hợp lệ.")
            return {}

        raw_filters = json.loads(match.group())
        validated = _validate_filter_values(raw_filters)
        logger.info(f"[LLM] Filters sau khi validate: {validated}")
        return validated

    except json.JSONDecodeError:
        logger.warning("[LLM] Không thể parse JSON từ phản hồi của Gemini.")
        return {}
    except Exception as e:
        logger.error(f"[LLM] Lỗi khi gọi Gemini API: {e}")
        return {}
