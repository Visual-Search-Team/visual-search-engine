import re
import logging

logger = logging.getLogger(__name__)

def remove_extra_whitespace(text: str) -> str:
    """Loại bỏ khoảng trắng thừa, tab, newline liên tiếp."""
    if not text:
        return text
    return re.sub(r'\s+', ' ', text).strip()

def remove_garbage_characters(text: str) -> str:
    """
    Loại bỏ các ký tự rác (chỉ giữ lại chữ cái, số, dấu câu cơ bản).
    Hỗ trợ tiếng Việt bằng cách không filter gắt gao các ký tự Unicode.
    """
    if not text:
        return text
    # Regex loại bỏ các ký tự điều khiển (control characters) và các ký hiệu lạ
    # Giữ lại: Chữ, số, khoảng trắng, dấu câu thông thường
    # \w bao gồm cả chữ có dấu (Unicode) và số.
    cleaned_text = re.sub(r'[^\w\s\.,!\?"\':;\(\)\-%/]', '', text)
    return cleaned_text

def spell_check(text: str, language: str = 'vi') -> str:
    """
    Kiểm tra và sửa lỗi chính tả.
    Đối với tiếng Việt, sửa lỗi chính tả rất phức tạp và cần thư viện NLP (như Underthesea, PhoNLP).
    Ở đây cung cấp sẵn một số luật Regex để sửa các lỗi nhận diện chữ sai phổ biến của OCR.
    """
    if not text:
        return text

    # --- Các lỗi OCR phổ biến ---
    # Nhầm số 0 và chữ O
    text = re.sub(r'\b0\b', 'O', text) 
    
    # Nhầm số 1 và chữ I/l
    text = re.sub(r'\b1\b(?![\d])', 'I', text) # Nếu đứng một mình, ưu tiên là chữ I
    
    # Bạn có thể tự thêm các luật thay thế (replace) từ sai chính tả phổ biến vào đây
    # Ví dụ:
    # text = text.replace("răng", "rằng") 
    # (Tương lai): Có thể cài đặt thư viện 'pyspellchecker' để sửa lỗi tự động cho tiếng Anh
    # if language == 'en':
    #     from spellchecker import SpellChecker
    #     spell = SpellChecker()
    #     words = text.split()
    #     misspelled = spell.unknown(words)
    #     for word in misspelled:
    #         correction = spell.correction(word)
    #         if correction:
    #             text = text.replace(word, correction)
    return text

def preprocess_ocr_text(text: str, language: str = 'vi') -> str:
    """Hàm tổng hợp tiền xử lý text từ OCR trước khi lưu vào DB."""
    if not text:
        return ""
        
    # Bước 1: Loại bỏ ký tự rác, ký hiệu lạ
    text = remove_garbage_characters(text)
    
    # Bước 2: Chuẩn hóa khoảng trắng
    text = remove_extra_whitespace(text)
    
    # Bước 3: Sửa lỗi chính tả cơ bản (Spell-checker)
    text = spell_check(text, language)
    
    return text
