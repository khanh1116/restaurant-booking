# chatbot/services/question_validator.py
"""
Question Validator - Pre-check câu hỏi trước khi qua SBERT
Xử lý: Câu chào hỏi vs câu lung tung
"""
import re
from typing import Optional, Dict, Any
from unidecode import unidecode


# =========================
# GREETING & SMALL TALK
# =========================

GREETING_KEYWORDS = {
    # Xin chào
    "hello": 100,
    "hi": 100,
    "alo": 100,
    "hallo": 100,
    "xin chao": 90,
    "chao": 90,
    "chào bạn": 85,
    "chào anh": 85,
    "chào em": 85,
    "tôi là": 70,  # "Tôi là AI"
    "bạn là ai": 70,
    "em là gì": 70,
    
    # Cảm ơn
    "thank you": 100,
    "thanks": 100,
    "cảm ơn": 100,
    "cam on": 100,
    "tks": 100,
    "ty": 100,
    
    # Tạm biệt
    "bye": 100,
    "goodbye": 100,
    "good bye": 100,
    "tạm biệt": 100,
    "tam biet": 100,
    "see you": 90,
    "tạm biệt nhé": 85,
    
    # Hỏi bình thường
    "ok": 80,
    "được": 75,
    "vâng": 75,
    "dạ": 75,
    "yes": 80,
    "no": 80,
    "không": 75,
    "không được": 70,
    "được không": 70,
}


class QuestionValidator:
    """
    Pre-check câu hỏi
    - Detect greeting/small talk -> đi thẳng vào ViT5 (không qua SBERT)
    - Detect nonsense/gibberish -> reject
    """
    
    def __init__(self):
        self.greeting_keywords = GREETING_KEYWORDS
        self.min_confidence = 0.65
    
    def _normalize(self, text: str) -> str:
        """Normalize text"""
        t = unidecode(text or "").lower()
        t = re.sub(r"[^a-z0-9\s]", " ", t)
        t = re.sub(r"\s+", " ", t).strip()
        return t
    
    def _is_greeting(self, norm_text: str) -> bool:
        """Check nếu là câu chào hỏi"""
        # Kiểm tra các greeting keywords (word boundary matching)
        for keyword in self.greeting_keywords.keys():
            # Use word boundary to match whole words only
            # Prevents 'ok' from matching 'korean', etc.
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, norm_text):
                return True
        
        return False
    
    def _is_nonsense(self, norm_text: str) -> bool:
        """
        Check nếu là câu lung tung (gibberish)
        Các dấu hiệu:
        - Rất ngắn (< 3 ký tự)
        - Chỉ có số (12345, 999, ...)
        - Random keys (asdfgh, qwerty, ...)
        - Không có vowels liên tiếp (vì mỗi từ đều cần vowels)
        """
        original_text = norm_text.replace(" ", "")
        
        # Quá ngắn
        if len(original_text) < 2:
            return True
        
        # Chỉ có số
        if re.match(r"^\d+$", original_text):
            return True
        
        # Random keys pattern - chuỗi ký tự liên tiếp không tạo từ
        # Ví dụ: "asdfgh", "qwerty", "123abc456"
        if not re.search(r"[aeiouàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]", original_text):
            # Không có vowels -> có thể là gibberish
            return True
        
        # Pattern như keyboard mash: asdf, qwer, zxcv, ...
        keyboard_patterns = ["asdf", "qwer", "zxcv", "hjkl", "asdfg", "qwert", "zxcvb"]
        for pattern in keyboard_patterns:
            if pattern in norm_text.replace(" ", ""):
                return True
        
        return False
    
    def validate(self, question: str) -> Dict[str, Any]:
        """
        Validate câu hỏi
        
        Returns:
            {
                "is_valid": bool,
                "type": "GREETING" | "NONSENSE" | "VALID",
                "message": str (nếu invalid),
                "skip_sbert": bool (True nếu là greeting -> đi vào ViT5 luôn)
            }
        """
        if not question or not question.strip():
            return {
                "is_valid": False,
                "type": "INVALID",
                "message": "Câu hỏi trống",
                "skip_sbert": False
            }
        
        norm_text = self._normalize(question)
        
        if not norm_text:
            return {
                "is_valid": False,
                "type": "INVALID",
                "message": "Câu hỏi không hợp lệ",
                "skip_sbert": False
            }
        
        # Check greeting
        if self._is_greeting(norm_text):
            return {
                "is_valid": True,
                "type": "GREETING",
                "message": None,
                "skip_sbert": True  # Đi vào ViT5 luôn (không cần SBERT)
            }
        
        # Check nonsense
        if self._is_nonsense(norm_text):
            return {
                "is_valid": False,
                "type": "NONSENSE",
                "message": "Tôi không hiểu câu hỏi của bạn, bạn có thể nói rõ hơn được không?",
                "skip_sbert": False
            }
        
        # Valid question -> cần qua SBERT bình thường
        return {
            "is_valid": True,
            "type": "VALID",
            "message": None,
            "skip_sbert": False
        }


def get_question_validator() -> QuestionValidator:
    """Singleton instance"""
    if not hasattr(get_question_validator, '_instance'):
        get_question_validator._instance = QuestionValidator()
    return get_question_validator._instance
