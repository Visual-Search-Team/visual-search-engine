import string
import unicodedata
import logging
import re

from app.embedding.constants import ATTRIBUTE_VI_LABELS, ATTRIBUTE_ALIASES, BROAD_CATEGORY_KEYWORDS

logger = logging.getLogger(__name__)

class IntentPriority:
    EXTREME_TEXT = (1, 0.25)
    STYLE_OVERRIDE = (2, 0.45)
    DETAIL_MODIFICATION = (3, 0.65)
    DEFAULT = (99, None)

INTENT_KEYWORDS = {
    "EXTREME_TEXT": ["thay thế hoàn toàn", "đổi hẳn sang", "không quan tâm ảnh"],
    "STYLE_OVERRIDE": ["phong cách", "kiểu", "vibe", "giống", "như", "tựa", "hầm hố", "vintage"],
    "DETAIL_MODIFICATION": ["có", "thêm", "kèm", "họa tiết", "in hình", "chữ"]
}

BASE_MARKERS = ["nền", "chủ_đạo"]
DETAIL_MARKERS = ["họa_tiết", "viền", "sọc", "chữ", "phối", "hình", "in", "caro", "kẻ", "chấm_bi", "loang"]
PUNCTUATION_MARKERS = [",", ".", "và", "cùng", "kèm"]

NEGATION_GROUP = r"(?:không\s+có|không\s+phải|không|trừ|ngoại\s+trừ|loại\s+trừ)"
MARKER_GROUP = r"(?:" + "|".join(BASE_MARKERS + DETAIL_MARKERS) + r")"

class QueryParser:
    @staticmethod
    def _custom_tokenize(text: str, phrases: list[str]) -> str:
        # Thay thế các cụm từ ghép thành dạng có gạch dưới (word_tokenize thủ công)
        # Giúp bảo toàn ranh giới từ mà không bị NLP model gom sai (vd: trắng_sọc)
        for p in sorted(phrases, key=lambda x: len(x.split()), reverse=True):
            if " " in p:
                text = text.replace(p, p.replace(" ", "_"))
        return text

    @staticmethod
    def extract_tags_from_text(text: str, client_alpha_hint: float = 0.7) -> tuple[dict[str, list[str]], dict[str, list[str]], str, float]:
        normalized = unicodedata.normalize("NFC", text.lower())
        
        # 1. Thu thập từ điển và Alias
        phrases_dict = {}
        multi_word_phrases = set(BASE_MARKERS + DETAIL_MARKERS + INTENT_KEYWORDS["EXTREME_TEXT"] + INTENT_KEYWORDS["STYLE_OVERRIDE"] + INTENT_KEYWORDS["DETAIL_MODIFICATION"])
        
        for attr_name, vi_labels in ATTRIBUTE_VI_LABELS.items():
            for vi_label in vi_labels.values():
                lbl = unicodedata.normalize("NFC", vi_label.lower())
                phrases_dict[lbl] = (attr_name, vi_label)
                multi_word_phrases.add(lbl)
                
        for attr_name, aliases in ATTRIBUTE_ALIASES.items():
            for alias_key, standard_val in aliases.items():
                lbl = unicodedata.normalize("NFC", alias_key.lower())
                phrases_dict[lbl] = (attr_name, standard_val)
                multi_word_phrases.add(lbl)
                
        # 2. Tokenize thủ công an toàn
        text_tokenized = QueryParser._custom_tokenize(normalized, list(multi_word_phrases))
        
        # Chuyển phrases_dict sang dạng underscore để lookup O(1)
        all_attr_tokens = {k.replace(" ", "_"): v for k, v in phrases_dict.items()}
        
        filters: dict[str, list[str]] = {}
        negative_filters: dict[str, list[str]] = {}
        
        # 3. Negation Regex
        text_clean = f" {text_tokenized} "
        for tok_key, (attr_name, std_val) in all_attr_tokens.items():
            escaped_tok = re.escape(tok_key)
            # Match: "trừ" + (marker)? + "đỏ"
            neg_pattern = rf"\b(?:{NEGATION_GROUP})\s+(?:(?:{MARKER_GROUP}|màu)\s+)?{escaped_tok}\b"
            
            matches = list(re.finditer(neg_pattern, text_clean))
            if matches:
                if attr_name not in negative_filters: negative_filters[attr_name] = []
                if std_val not in negative_filters[attr_name]:
                    negative_filters[attr_name].append(std_val)
                text_clean = re.sub(neg_pattern, " ", text_clean)

        # 4. State Machine (Context Scanning)
        text_for_split = re.sub(r'([,\.])', r' \1 ', text_clean)
        tokens = text_for_split.split()
        tuong = {}
        linh = []
        state = "normal"
        
        def _peek_ahead_attr(idx):
            for step in range(1, 4): # Nhìn trước tối đa 3 token (xuyên qua "màu", "là")
                if idx + step < len(tokens):
                    tok = tokens[idx + step]
                    if tok in all_attr_tokens:
                        return idx + step, tok
            return None, None

        i = 0
        while i < len(tokens):
            tok = tokens[i]
            
            if tok in PUNCTUATION_MARKERS:
                state = "normal"
                linh.append(tok)
                i += 1
                continue
                
            if tok in DETAIL_MARKERS:
                state = "linh_mode"
                linh.append(tok)
                i += 1
                continue
                
            if tok in BASE_MARKERS:
                attr_idx, attr_tok = _peek_ahead_attr(i)
                if attr_tok:
                    attr_name, std_val = all_attr_tokens[attr_tok]
                    if attr_name in tuong:
                        linh.append(tuong[attr_name][1]) # Demotion (đẩy Tướng cũ xuống Lính)
                    tuong[attr_name] = (std_val, attr_tok)
                    state = "normal"
                    i = attr_idx + 1 # Tiêu thụ cụm base marker + thuộc tính
                    continue
                else:
                    state = "normal"
                    i += 1
                    continue
            
            # Xóa chữ "màu" nếu đứng ngay trước token màu sắc (tránh nhiễu translation)
            if tok == "màu":
                attr_idx, attr_tok = _peek_ahead_attr(i)
                if attr_tok and all_attr_tokens[attr_tok][0] == "color":
                    i += 1
                    continue
                    
            if tok in all_attr_tokens:
                attr_name, std_val = all_attr_tokens[tok]
                if state == "linh_mode":
                    linh.append(tok)
                elif attr_name not in tuong:
                    tuong[attr_name] = (std_val, tok)
                    if attr_name == "category":
                        linh.append(tok) # Giữ lại category trong remaining_text cho CLIP
                else:
                    linh.append(tok)
                i += 1
                continue
                
            linh.append(tok)
            i += 1
            
        # 5. Build Result
        for attr_name, (std_val, tok) in tuong.items():
            filters[attr_name] = [std_val]
            
        remaining_text = " ".join(linh).replace("_", " ")
        
        # 6. Intent Priority (Dynamic Alpha)
        dynamic_alpha = client_alpha_hint
        current_priority = IntentPriority.DEFAULT[0]
        
        # Lấy tokens từ chuỗi text_tokenized (chưa bị xóa negation) để xét intent
        intent_tokens = text_tokenized.split()
        
        for intent_key, keywords in INTENT_KEYWORDS.items():
            for kw in keywords:
                kw_tok = kw.replace(" ", "_")
                if kw_tok in intent_tokens:
                    p_tuple = getattr(IntentPriority, intent_key)
                    if p_tuple[0] < current_priority:
                        current_priority = p_tuple[0]
                        dynamic_alpha = p_tuple[1]
                        
        remaining_text = " ".join(remaining_text.split())
        logger.debug(f"[extract_tags] filters: {filters}, neg: {negative_filters}, remaining: '{remaining_text}', alpha: {dynamic_alpha}")
        
        return filters, negative_filters, remaining_text, dynamic_alpha

