import string
import unicodedata
import logging

from app.embedding.constants import ATTRIBUTE_VI_LABELS, ATTRIBUTE_ALIASES, BROAD_CATEGORY_KEYWORDS

logger = logging.getLogger(__name__)

class QueryParser:
    @staticmethod
    def extract_tags_from_text(text: str) -> dict[str, list[str]]:
        # Chuẩn hoá Unicode NFC: fix lỗi NFC vs NFD mà bàn phím Tiếng Việt hay sinh ra
        normalized = unicodedata.normalize("NFC", text.lower())
        
        # Loại bỏ dấu câu và thêm khoảng trắng 2 đầu để tìm kiếm từ vựng
        clean_text = normalized.translate(str.maketrans('', '', string.punctuation))
        padded = f" {clean_text} "
        
        # Alias Mapping: Đổi các từ lóng thành từ chuẩn trong từ điển VI_LABELS
        for attr_name, aliases in ATTRIBUTE_ALIASES.items():
            for alias_key, standard_val in aliases.items():
                nfc_key = unicodedata.normalize("NFC", alias_key)
                nfc_val = unicodedata.normalize("NFC", standard_val)
                padded = padded.replace(f" {nfc_key} ", f" {nfc_val} ")
        
        logger.debug(f"[extract_tags] padded after alias: '{padded.strip()}'")

        filters: dict[str, list[str]] = {}
        query_words = set(padded.split())

        for attr_name, vi_labels in ATTRIBUTE_VI_LABELS.items():
            # Gom tất cả nhãn của thuộc tính này lại, ưu tiên nhãn có nhiều từ nhất
            sorted_labels = sorted(vi_labels.values(), key=lambda x: len(x.split()), reverse=True)
            
            for vi_label in sorted_labels:
                # BoW Subset Match: Không quan tâm thứ tự từ (tay ngắn == ngắn tay)
                label_words = set(unicodedata.normalize("NFC", vi_label.lower()).split())
                if label_words.issubset(query_words):
                    filters[attr_name] = [vi_label]
                    break
            
            # Double-safety: Nếu BoW trượt, check trực tiếp alias
            if attr_name not in filters and attr_name in ATTRIBUTE_ALIASES:
                for alias_key, standard_val in ATTRIBUTE_ALIASES[attr_name].items():
                    alias_words = set(unicodedata.normalize("NFC", alias_key.lower()).split())
                    if alias_words.issubset(query_words):
                        filters[attr_name] = [standard_val]
                        break

        # Xử lý đặc biệt cho màu "xanh"
        if "color" not in filters and " xanh " in padded:
            filters["color"] = ["xanh dương", "xanh lá"]

        # Broad match cho nhóm ngành hàng gốc
        if "category" not in filters:
            category_labels = ATTRIBUTE_VI_LABELS["category"]
            for keyword in BROAD_CATEGORY_KEYWORDS:
                if keyword in normalized:
                    matched = [label for label in category_labels.values() if keyword in label.lower()]
                    if matched:
                        filters["category"] = matched
                    break

        return filters
