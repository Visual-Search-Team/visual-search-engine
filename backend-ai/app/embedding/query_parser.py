import re
from app.embedding.constants import ATTRIBUTE_VI_LABELS, BROAD_CATEGORY_KEYWORDS

STOP_WORDS = ["có", "nhưng", "màu", "thêm", "kiểu", "cho", "với", "bằng", "dáng", "loại", "hàng", "của", "phong cách", "đồ", "phiên bản", "hơn", "một chút", "họa tiết", "hoa văn", "nhãn hiệu", "thương hiệu", "hiệu", "hãng", "tay áo", "tay", "cổ áo", "cổ", "phải", "kẻ"]

class QueryParser:
    @staticmethod
    def extract_tags_from_text(text: str) -> dict[str, list[str]]:
        filters, _, _ = QueryParser.parse_and_clean_query(text)
        return filters

    @staticmethod
    def parse_and_clean_query(text: str) -> tuple[dict[str, list[str]], dict[str, list[str]], str]:
        """
        Bóc tách thuộc tính xuất hiện trực tiếp trong câu tìm kiếm tiếng Việt 
        và trả về đoạn văn bản còn sót lại (sau khi đã lọc bỏ stop words).
        Hỗ trợ bóc tách cả các câu lệnh phủ định (negative filters).
        """
        normalized = text.lower()
        
        # Xử lý từ đồng nghĩa trước khi match
        normalized = normalized.replace("quần đùi", "quần short")
        normalized = normalized.replace("áo phông", "áo thun")
        normalized = normalized.replace(" mu", " manchester united")
        normalized = normalized.replace(" lv", " louis vuitton")
        normalized = normalized.replace("tay dài", "dài tay")
        normalized = normalized.replace("tay ngắn", "ngắn tay")
        
        filters: dict[str, list[str]] = {}
        negative_filters: dict[str, list[str]] = {}
        cleaned_text = normalized
        
        ATTR_CLASSIFIERS = {
            "color": r'(màu\s+)?',
            "pattern": r'(họa tiết\s+|hoa văn\s+|kẻ\s+)?',
            "brand": r'(nhãn hiệu\s+|thương hiệu\s+|hiệu\s+|hãng\s+)?',
            "neckline": r'(cổ áo\s+|cổ\s+)?',
            "sleeve": r'(tay áo\s+|tay\s+)?',
            "fit": r'(dáng\s+|form\s+|kiểu\s+)?',
            "style": r'(phong cách\s+|kiểu\s+)?',
            "category": r'(loại\s+|kiểu\s+)?'
        }
        
        GENERAL_FILLERS = r'(có\s+|phải\s+|là\s+)*'

        for attr_name, vi_labels in ATTRIBUTE_VI_LABELS.items():
            attr_cls = ATTR_CLASSIFIERS.get(attr_name, "")
            found_labels = []
            found_neg_labels = []
            for vi_label in sorted(vi_labels.values(), key=len, reverse=True):
                vi_label_lower = vi_label.lower()
                
                # Check for negation first
                neg_pattern = r'\b(không có|không phải|không)\s+' + GENERAL_FILLERS + attr_cls + re.escape(vi_label_lower) + r'\b'
                if re.search(neg_pattern, cleaned_text):
                    found_neg_labels.append(vi_label)
                    cleaned_text = re.sub(neg_pattern, " ", cleaned_text)
                    continue # Skip positive match if it was matched as negative
                
                # Positive match
                pattern = r'\b' + attr_cls + re.escape(vi_label_lower) + r'\b'
                if re.search(pattern, cleaned_text):
                    found_labels.append(vi_label)
                    cleaned_text = re.sub(pattern, " ", cleaned_text)
                    
            if found_labels:
                filters[attr_name] = found_labels
            if found_neg_labels:
                negative_filters[attr_name] = found_neg_labels

        # Xử lý đặc biệt cho màu "xanh"
        if "color" not in filters and "color" not in negative_filters:
            attr_cls = ATTR_CLASSIFIERS["color"]
            neg_xanh = r'\b(không có|không phải|không|chẳng)\s+' + GENERAL_FILLERS + attr_cls + r'xanh\b'
            if re.search(neg_xanh, cleaned_text):
                negative_filters["color"] = ["Xanh dương", "Xanh lá"]
                cleaned_text = re.sub(neg_xanh, " ", cleaned_text)
            elif re.search(r'\b' + attr_cls + r'xanh\b', cleaned_text):
                filters["color"] = ["Xanh dương", "Xanh lá"]
                cleaned_text = re.sub(r'\b' + attr_cls + r'xanh\b', " ", cleaned_text)

        # Broad match
        if "category" not in filters and "category" not in negative_filters:
            attr_cls = ATTR_CLASSIFIERS["category"]
            category_labels = ATTRIBUTE_VI_LABELS["category"]
            for keyword in BROAD_CATEGORY_KEYWORDS:
                neg_pattern = r'\b(không có|không phải|không|chẳng)\s+' + GENERAL_FILLERS + attr_cls + re.escape(keyword) + r'\b'
                if re.search(neg_pattern, cleaned_text):
                    matched = [label for label in category_labels.values() if keyword in label.lower()]
                    if matched:
                        negative_filters["category"] = matched
                    cleaned_text = re.sub(neg_pattern, " ", cleaned_text)
                    break
                    
                pattern = r'\b' + attr_cls + re.escape(keyword) + r'\b'
                if re.search(pattern, cleaned_text):
                    matched = [label for label in category_labels.values() if keyword in label.lower()]
                    if matched:
                        filters["category"] = matched
                    cleaned_text = re.sub(pattern, " ", cleaned_text)
                    break

        # Ánh xạ các khái niệm phủ định chung (generic negation) về các giá trị 'vắng mặt' (absence) thực tế
        # Phải chạy sau cùng để không ăn mất các cụm từ phủ định cụ thể (vd: "không phải thương hiệu adidas")
        ABSENCE_MAPPING = {
            "họa tiết": ("pattern", "Trơn"),
            "hoa văn": ("pattern", "Trơn"),
            "tay": ("sleeve", "Sát nách"),
            "tay áo": ("sleeve", "Sát nách"),
            "hiệu": ("brand", "Không rõ hãng"),
            "hãng": ("brand", "Không rõ hãng"),
            "nhãn hiệu": ("brand", "Không rõ hãng"),
            "thương hiệu": ("brand", "Không rõ hãng"),
            "cổ": ("neckline", "Không cổ"),
            "cổ áo": ("neckline", "Không cổ")
        }

        for term, (attr_name, replacement) in ABSENCE_MAPPING.items():
            neg_term_pattern = r'\b(không có|không phải|không|chẳng)\s+' + GENERAL_FILLERS + re.escape(term) + r'\b'
            if re.search(neg_term_pattern, cleaned_text):
                if attr_name not in filters:
                    filters[attr_name] = []
                if replacement not in filters[attr_name]:
                    filters[attr_name].append(replacement)
                cleaned_text = re.sub(neg_term_pattern, " ", cleaned_text)

        # Remove extra spaces
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()

        # Kiểm tra xem chuỗi còn lại có mang ý nghĩa không
        test_text = cleaned_text
        for word in STOP_WORDS:
            test_text = re.sub(r'\b' + re.escape(word) + r'\b', ' ', test_text)
        
        # Xóa dấu câu
        test_text = re.sub(r'[^\w\s]', '', test_text)
        test_text = re.sub(r'\s+', ' ', test_text).strip()
        
        if not test_text:
            cleaned_text = ""
            
        return filters, negative_filters, cleaned_text
