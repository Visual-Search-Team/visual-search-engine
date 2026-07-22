import re
import logging
from langdetect import detect, LangDetectException
from spellchecker import SpellChecker

logger = logging.getLogger(__name__)

# Khởi tạo SpellChecker một lần
try:
    _en_spellchecker = SpellChecker(language='en')
except Exception as e:
    logger.warning(f"Không thể khởi tạo SpellChecker: {e}")
    _en_spellchecker = None

def remove_extra_whitespace(text: str) -> str:
    """Loại bỏ khoảng trắng thừa, tab, newline liên tiếp."""
    if not text:
        return text
    return re.sub(r'\s+', ' ', text).strip()

def remove_garbage_characters(text: str) -> str:
    """Loại bỏ các ký tự rác (chỉ giữ lại chữ cái, số, dấu câu cơ bản)."""
    if not text:
        return text
    cleaned_text = re.sub(r'[^\w\s\.,!\?"\':;\(\)\-%/]', '', text)
    return cleaned_text

def spell_check_en(text: str) -> str:
    """Kiểm tra và sửa lỗi chính tả tiếng Anh bằng pyspellchecker."""
    if not _en_spellchecker:
        return text
        
    words = text.split()
    misspelled = _en_spellchecker.unknown(words)
    
    for word in misspelled:
        correction = _en_spellchecker.correction(word)
        if correction:
            # Thay thế cẩn thận bằng Regex Word Boundary để không đè vào chữ khác
            text = re.sub(r'\b' + re.escape(word) + r'\b', correction, text)
            
    return text

import itertools

def get_word_variants(word: str) -> list[str]:
    """Tạo ra các biến thể của từ bằng cách hoán đổi 0/O/o và 1/I/l."""
    options = []
    for char in word:
        if char in '0Oo':
            # Ưu tiên các chữ cái trước, số sau
            options.append(['o', 'O', '0'])
        elif char in '1Il':
            options.append(['l', 'I', '1'])
        else:
            options.append([char])
            
    # Tạo tất cả tổ hợp (vd: h0a -> hoa, hOa, h0a)
    variants = [''.join(v) for v in itertools.product(*options)]
    return variants

def check_in_dict(word: str, lang: str) -> bool:
    """Kiểm tra xem từ có hợp lệ trong ngôn ngữ không."""
    if lang == 'en' and _en_spellchecker:
        # Kiểm tra bằng từ điển tiếng Anh của pyspellchecker
        return len(_en_spellchecker.known([word.lower()])) > 0
    else:
        # Tiếng Việt: Thường lỗi OCR là trộn lẫn số vào chữ (vd: h0a, M1nh).
        # Một từ tiếng Việt hợp lệ thường chỉ chứa toàn chữ cái (isalpha) 
        # hoặc toàn số (isdigit). 
        # string.isalpha() trong Python hỗ trợ tốt Unicode tiếng Việt.
        return word.isalpha() or word.isdigit()

def spell_check_basic(text: str, lang: str) -> str:
    """
    Sinh các biến thể cho các từ nghi ngờ chứa (0, O, 1, I, l) 
    và kiểm tra xem biến thể nào hợp lệ.
    """
    words = text.split()
    corrected_words = []
    
    for word in words:
        # Nếu từ không chứa các ký tự dễ nhầm lẫn, giữ nguyên
        if not any(c in word for c in '0Oo1Il'):
            corrected_words.append(word)
            continue
            
        # Nếu từ gốc đã chuẩn, không cần đổi
        if check_in_dict(word, lang):
            corrected_words.append(word)
            continue
            
        variants = get_word_variants(word)
        found_correction = False
        
        # Tìm biến thể đầu tiên hợp lệ trong từ điển
        for variant in variants:
            if check_in_dict(variant, lang):
                corrected_words.append(variant)
                found_correction = True
                break
                
        # Nếu không có biến thể nào hợp lệ, trả về từ gốc
        if not found_correction:
            corrected_words.append(word)
            
    return ' '.join(corrected_words)

def preprocess_ocr_text(text: str, language: str = None) -> str:
    """Hàm tổng hợp tiền xử lý text từ OCR trước khi lưu vào DB."""
    if not text:
        return ""
        
    # Bước 1: Loại bỏ ký tự rác, ký hiệu lạ
    text = remove_garbage_characters(text)
    
    # Bước 2: Chuẩn hóa khoảng trắng
    text = remove_extra_whitespace(text)
    
    if not text.strip():
        return ""
        
    # Bước 3: Tự động nhận diện ngôn ngữ
    lang = 'en' # Mặc định
    try:
        lang = detect(text)
    except LangDetectException:
        pass
        
    # Bước 4: Sửa lỗi cơ bản bằng cách sinh biến thể (Áp dụng đa ngôn ngữ)
    text = spell_check_basic(text, lang)
    
    # Bước 5: Nếu là tiếng Anh thì chạy Spellchecker
    if lang == 'en':
        text = spell_check_en(text)
    else:
        # Nếu là tiếng Việt hoặc khác, có thể thêm luật riêng biệt ở đây sau
        pass
        
    # Bước 6: Chuyển toàn bộ text về chữ thường (lowercase)
    text = text.lower()
        
    return text
