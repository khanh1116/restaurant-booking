# chatbot/services/slot_extractor.py
"""
Slot Extractor - Trích xuất thông tin từ câu hỏi
CONVERTED from Python to Django
"""
import re
import datetime as dt
from typing import Optional, Dict, Any, List, Tuple
from rapidfuzz import fuzz, process
from unidecode import unidecode
from django.conf import settings

from chatbot.utils.db_queries import (
    fetch_all_restaurants,
    fetch_all_locations,
    fetch_menu_items,
    fetch_categories,
    get_connection  # Mock connection
)


# =========================
# CONSTANTS
# =========================

# Lấy thresholds từ settings
CONFIG = settings.CHATBOT_CONFIG

RES_STRICT_THRESHOLD = CONFIG['RES_STRICT_THRESHOLD']
RES_AMBIGUOUS_THRESHOLD = CONFIG['RES_AMBIGUOUS_THRESHOLD']
DISH_STRICT_THRESHOLD = CONFIG['DISH_STRICT_THRESHOLD']
DISH_AMBIGUOUS_THRESHOLD = CONFIG['DISH_AMBIGUOUS_THRESHOLD']
LOCATION_STRICT_THRESHOLD = CONFIG['LOCATION_STRICT_THRESHOLD']
LOCATION_AMBIGUOUS_THRESHOLD = CONFIG['LOCATION_AMBIGUOUS_THRESHOLD']

# Các pattern tiền tố phổ biến trong tên nhà hàng
_PREFIX_REGEXES = [
    r"nha\s+hang\w*",
    r"nhahang\w*",
    r"quan\w*",
    r"cua\s+hang\w*",
    r"cuahang\w*",
]

# Mapping từ khóa -> category chuẩn
CATEGORY_KEYWORDS = {
    "Món chính": ["mon chinh", "main course", "chinh", "main"],
    "Khai vị": ["khai vi", "appetizer", "mon khai vi", "khaivi"],
    "Tráng miệng": ["trang mieng", "dessert", "do ngot", "ngot", "trangmieng"],
    "Đồ uống": ["do uong", "drink", "nuoc", "beverage", "douong", "nuoc uong"],
    "Món phụ": ["mon phu", "side dish", "phu", "monphu"],
}

# Từ khóa địa điểm
DISTRICT_KEYWORDS = ["quan", "quận", "q", "q.", "district"]
CITY_KEYWORDS = ["thanh pho", "thành phố", "tp", "tp.", "city"]
WARD_KEYWORDS = ["phuong", "phường", "p", "p.", "ward"]


# =========================
# 1. UTILITY FUNCTIONS
# =========================

def _normalize_text(text: str, remove_prefix: bool = False) -> str:
    """Chuẩn hóa text"""
    t = unidecode(text or "").lower()
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    t = t.lstrip()
    
    if remove_prefix:
        for regex in _PREFIX_REGEXES:
            m = re.match(regex + r"\s*", t)
            if m:
                t = t[m.end():]
                break
    
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _fuzzy_match(query: str, choices: List[str], threshold: float) -> Optional[Tuple[str, float, int]]:
    """Thực hiện fuzzy matching"""
    if not choices:
        return None
    
    result = process.extractOne(query, choices, scorer=fuzz.WRatio)
    if result is None:
        return None
    
    matched, score, idx = result
    if score >= threshold:
        return (matched, float(score), idx)
    
    return None


# =========================
# 2. RESTAURANT EXTRACTION
# =========================

def extract_restaurant(user_text: str, conn=None) -> Dict[str, Any]:
    """
    Trích xuất thông tin nhà hàng từ câu hỏi
    CHỈ TRÍ XUẤ KHI STATUS = "OK" (confidence cao)
    
    Returns:
        {
            "status": "OK" | "ASK_CONFIRM" | "ASK_NAME" | "NO_DATA",
            "restaurant": {...} | None,
            "score": float | None
        }
    """
    # conn không dùng nữa, nhưng giữ để tương thích
    restaurants = fetch_all_restaurants()
    
    if not restaurants:
        return {"status": "NO_DATA", "restaurant": None, "score": None}

    names = [r["name"] for r in restaurants]
    norm_names = [_normalize_text(n, remove_prefix=True) for n in names]
    
    query_norm = _normalize_text(user_text, remove_prefix=False)
    if not query_norm:
        return {"status": "ASK_NAME", "restaurant": None, "score": None}

    best_idx = None
    best_score = -1.0

    # BƯỚC 1: SUBSTRING MATCH
    for idx, norm_name in enumerate(norm_names):
        if not norm_name:
            continue
        pattern = r"\b" + re.escape(norm_name) + r"\b"
        if re.search(pattern, query_norm):
            score = 100.0
            if score > best_score:
                best_score = score
                best_idx = idx

    # BƯỚC 2: FUZZY MATCH
    if best_idx is None:
        result = process.extractOne(query_norm, norm_names, scorer=fuzz.WRatio)
        if result is None:
            return {"status": "ASK_NAME", "restaurant": None, "score": None}
        _, score, idx = result
        best_score = float(score)
        best_idx = idx

    best_rest = restaurants[best_idx]

    # Phân loại theo ngưỡng - CHỈ TRẢ VỀ KHI STATUS = OK
    if best_score >= RES_STRICT_THRESHOLD:
        return {"status": "OK", "restaurant": best_rest, "score": best_score}
    
    # ASK_CONFIRM hoặc ASK_NAME thì trả về None (không lấy slot này)
    return {"status": "ASK_NAME", "restaurant": None, "score": None}


# =========================
# 3. LOCATION EXTRACTION
# =========================

def extract_location(user_text: str, conn=None) -> Dict[str, Any]:
    """
    Trích xuất thông tin địa điểm (city, district, ward)
    CHỈ TRẢ VỀ 1 LOCATION CÓ CONFIDENCE CAO NHẤT
    
    Returns:
        {
            "city": str | None,
            "district": str | None,
            "ward": str | None,
            "confidence": float | None,
            "type": "city" | "district" | "ward" | None
        }
    """
    locations = fetch_all_locations()
    if not locations:
        return {
            "city": None,
            "district": None,
            "ward": None,
            "confidence": None,
            "type": None
        }
    
    # Lấy danh sách unique
    cities = list(set([loc["city"] for loc in locations if loc.get("city")]))
    districts = list(set([loc["district"] for loc in locations if loc.get("district")]))
    wards = list(set([loc["ward"] for loc in locations if loc.get("ward")]))
    
    query_norm = _normalize_text(user_text)
    
    # Dictionary lưu các kết quả tạm thời {"type": (value, confidence)}
    candidates = {}
    
    # Extract City
    if cities:
        city_choices = [_normalize_text(c) for c in cities]
        match = _fuzzy_match(query_norm, city_choices, LOCATION_STRICT_THRESHOLD)
        if match:
            candidates["city"] = (cities[match[2]], match[1])
    
    # Extract District
    if districts:
        district_choices = [_normalize_text(d) for d in districts]
        match = _fuzzy_match(query_norm, district_choices, LOCATION_STRICT_THRESHOLD)
        if match:
            candidates["district"] = (districts[match[2]], match[1])
        else:
            # Thử pattern "quận X", "q.X"
            for keyword in DISTRICT_KEYWORDS:
                pattern = rf"\b{keyword}\s*(\d+|[a-z]+)\b"
                m = re.search(pattern, query_norm)
                if m:
                    district_num = m.group(1)
                    for idx, d in enumerate(districts):
                        if district_num in _normalize_text(d):
                            # Pattern match -> score cao (90)
                            candidates["district"] = (d, 90.0)
                            break
    
    # Extract Ward (nhưng CHỈ nếu confidence cao và KHÔNG trùng lặp với district/city)
    if wards:
        ward_choices = [_normalize_text(w) for w in wards]
        match = _fuzzy_match(query_norm, ward_choices, LOCATION_STRICT_THRESHOLD)
        if match:
            # Chỉ thêm ward nếu score cao hơn district hoặc district không có
            if "district" not in candidates or match[1] > candidates.get("district", (None, 0))[1]:
                candidates["ward"] = (wards[match[2]], match[1])
    
    # Chỉ lấy location có confidence cao nhất
    best_type = None
    best_value = None
    best_confidence = -1.0
    
    for loc_type, (value, confidence) in candidates.items():
        if confidence > best_confidence:
            best_confidence = confidence
            best_type = loc_type
            best_value = value
    
    result = {
        "city": None,
        "district": None,
        "ward": None,
        "confidence": None,
        "type": None
    }
    
    if best_type:
        result[best_type] = best_value
        result["confidence"] = best_confidence
        result["type"] = best_type
    
    return result


# =========================
# 4. MENU / DISH EXTRACTION
# =========================

def extract_dish_name(user_text: str, conn=None, restaurant_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Trích xuất tên món ăn từ câu hỏi
    CHỈ TRÍ XUẤ KHI STATUS = "OK" (confidence cao)
    
    Returns:
        {
            "status": "OK" | "ASK_CONFIRM" | "ASK_DISH" | "NO_DATA",
            "dish": {...} | None,
            "score": float | None
        }
    """
    dishes = fetch_menu_items(restaurant_id=restaurant_id)
    if not dishes:
        return {"status": "NO_DATA", "dish": None, "score": None}
    
    dish_names = [d["name"] for d in dishes]
    norm_names = [_normalize_text(n) for n in dish_names]
    
    query_norm = _normalize_text(user_text)
    if not query_norm:
        return {"status": "ASK_DISH", "dish": None, "score": None}
    
    best_idx = None
    best_score = -1.0
    
    # BƯỚC 1: SUBSTRING MATCH
    for idx, norm_name in enumerate(norm_names):
        if not norm_name:
            continue
        pattern = r"\b" + re.escape(norm_name) + r"\b"
        if re.search(pattern, query_norm):
            score = 100.0
            if score > best_score:
                best_score = score
                best_idx = idx
    
    # BƯỚC 2: FUZZY MATCH
    if best_idx is None:
        result = process.extractOne(query_norm, norm_names, scorer=fuzz.WRatio)
        if result is None:
            return {"status": "ASK_DISH", "dish": None, "score": None}
        _, score, idx = result
        best_score = float(score)
        best_idx = idx
    
    best_dish = dishes[best_idx]
    
    # Phân loại theo ngưỡng - CHỈ TRẢ VỀ KHI STATUS = OK
    if best_score >= DISH_STRICT_THRESHOLD:
        return {"status": "OK", "dish": best_dish, "score": best_score}
    
    # ASK_CONFIRM hoặc ASK_DISH thì trả về None (không lấy slot này)
    return {"status": "ASK_DISH", "dish": None, "score": None}


def extract_category(user_text: str, conn=None) -> Dict[str, Any]:
    """
    Trích xuất category món ăn từ câu hỏi
    
    Returns:
        {
            "category": str | None,
            "confidence": float | None
        }
    """
    query_norm = _normalize_text(user_text)
    
    best_category = None
    best_score = 0.0
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in query_norm:
                score = len(keyword) / len(query_norm) * 100
                if score > best_score:
                    best_score = score
                    best_category = category
    
    # Nếu không match keyword, thử fuzzy với danh sách categories từ DB
    if best_category is None:
        categories = fetch_categories()
        if categories:
            cat_choices = [_normalize_text(c) for c in categories]
            match = _fuzzy_match(query_norm, cat_choices, 60.0)
            if match:
                best_category = categories[match[2]]
                best_score = match[1]
    
    return {
        "category": best_category,
        "confidence": best_score if best_category else None
    }


# =========================
# 5. DATE & TIME EXTRACTION
# =========================

def extract_date(user_text: str, today: Optional[dt.date] = None) -> Optional[str]:
    """
    Trích xuất ngày từ câu hỏi
    Returns: 'YYYY-MM-DD' hoặc None
    """
    today = today or dt.date.today()
    text = _normalize_text(user_text)
    
    # Relative dates
    if "hom nay" in text or "toi nay" in text:
        return today.isoformat()
    if "ngay mai" in text or "mai" in text:
        return (today + dt.timedelta(days=1)).isoformat()
    if "tuan sau" in text or "tuan toi" in text:
        return (today + dt.timedelta(days=7)).isoformat()
    if "ngay kia" in text:
        return (today + dt.timedelta(days=2)).isoformat()
    
    # YYYY-MM-DD
    m = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", user_text)
    if m:
        try:
            y, mth, d = map(int, m.groups())
            return dt.date(y, mth, d).isoformat()
        except ValueError:
            pass
    
    # DD/MM/YYYY
    m = re.search(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", user_text)
    if m:
        d, mth, y = map(int, m.groups())
        try:
            return dt.date(y, mth, d).isoformat()
        except ValueError:
            pass
    
    # DD-MM-YYYY
    m = re.search(r"\b(\d{1,2})-(\d{1,2})-(\d{4})\b", user_text)
    if m:
        d, mth, y = map(int, m.groups())
        try:
            return dt.date(y, mth, d).isoformat()
        except ValueError:
            pass
    
    return None


def extract_time(user_text: str) -> Optional[str]:
    """
    Trích xuất giờ từ câu hỏi
    Returns: 'HH:MM' hoặc None
    """
    # HH:MM
    m = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", user_text)
    if m:
        hh, mm = m.groups()
        return f"{int(hh):02d}:{int(mm):02d}"
    
    # "7 giờ 30", "7 gio 30"
    text = _normalize_text(user_text)
    m = re.search(r"\b(\d{1,2})\s*gio\s*(\d{1,2})?\b", text)
    if m:
        hh = int(m.group(1))
        mm = int(m.group(2)) if m.group(2) else 0
        if 0 <= hh <= 23 and 0 <= mm <= 59:
            return f"{hh:02d}:{mm:02d}"
    
    # "7h", "19h"
    m = re.search(r"\b(\d{1,2})h\b", text)
    if m:
        hh = int(m.group(1))
        if 0 <= hh <= 23:
            return f"{hh:02d}:00"
    
    return None


# =========================
# 6. NUMBER OF GUESTS
# =========================

def extract_num_guests(user_text: str) -> Optional[int]:
    """
    Trích xuất số khách từ câu hỏi
    Returns: int hoặc None
    """
    text = _normalize_text(user_text)
    
    # Pattern ưu tiên: "4 nguoi", "4 khach"
    m = re.search(r"\b(\d{1,2})\s*(nguoi|khach)\b", text)
    if m:
        try:
            num = int(m.group(1))
            if 1 <= num <= 50:
                return num
        except ValueError:
            pass
    
    # "cho 4 người", "đặt 6 chỗ"
    m = re.search(r"\b(cho|dat)\s+(\d{1,2})\s*(nguoi|khach|cho)?\b", text)
    if m:
        try:
            num = int(m.group(2))
            if 1 <= num <= 50:
                return num
        except ValueError:
            pass
    
    return None


# =========================
# 7. PRICE RANGE EXTRACTION
# =========================

def extract_price_range(user_text: str) -> Optional[Dict[str, int]]:
    """
    Trích xuất khoảng giá từ câu hỏi
    Returns: {"min": int, "max": int} hoặc None
    """
    text = _normalize_text(user_text)
    
    # Pattern: "100k-300k", "100-300k"
    m = re.search(r"\b(\d+)\s*k?\s*-\s*(\d+)\s*k\b", text)
    if m:
        try:
            min_price = int(m.group(1)) * 1000
            max_price = int(m.group(2)) * 1000
            return {"min": min_price, "max": max_price}
        except ValueError:
            pass
    
    # Pattern: "từ 100k đến 300k"
    m = re.search(r"\btu\s+(\d+)\s*k\s+den\s+(\d+)\s*k\b", text)
    if m:
        try:
            min_price = int(m.group(1)) * 1000
            max_price = int(m.group(2)) * 1000
            return {"min": min_price, "max": max_price}
        except ValueError:
            pass
    
    # Pattern: "dưới 500k"
    m = re.search(r"\b(duoi|nho hon|<)\s+(\d+)\s*k\b", text)
    if m:
        try:
            max_price = int(m.group(2)) * 1000
            return {"min": 0, "max": max_price}
        except ValueError:
            pass
    
    # Pattern: "trên 200k"
    m = re.search(r"\b(tren|lon hon|>)\s+(\d+)\s*k\b", text)
    if m:
        try:
            min_price = int(m.group(2)) * 1000
            return {"min": min_price, "max": 999999999}
        except ValueError:
            pass
    
    return None


# =========================
# 8. BOOKING STATUS
# =========================

def extract_booking_status(user_text: str) -> Optional[str]:
    """
    Trích xuất trạng thái booking từ câu hỏi
    Returns: "PENDING" | "CONFIRMED" | ... | None
    """
    text = _normalize_text(user_text)
    
    status_map = {
        "PENDING": ["cho xac nhan", "dang cho", "pending"],
        "CONFIRMED": ["da xac nhan", "confirmed", "xac nhan"],
        "REJECTED": ["tu choi", "rejected", "bi tu choi"],
        "CANCELLED": ["da huy", "cancelled", "huy"],
        "COMPLETED": ["hoan thanh", "completed", "da hoan thanh"],
        "NO_SHOW": ["khong den", "no show", "vang mat"]
    }
    
    for status, keywords in status_map.items():
        for keyword in keywords:
            if keyword in text:
                return status
    
    return None


# =========================
# 9. SLOT CONSOLIDATION
# =========================

def extract_all_slots(user_text: str, conn=None, restaurant_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Trích xuất tất cả slots từ một câu hỏi
    
    NOTE: conn parameter giữ để tương thích, nhưng không dùng nữa (Django ORM)
    
    Returns:
        {
            "restaurant": {...},
            "location": {...},
            "dish": {...},
            "category": {...},
            "date": str,
            "time": str,
            "num_guests": int,
            "price_range": {...},
            "booking_status": str
        }
    """
    return {
        "restaurant": extract_restaurant(user_text, conn),
        "location": extract_location(user_text, conn),
        "dish": extract_dish_name(user_text, conn, restaurant_id),
        "category": extract_category(user_text, conn),
        "date": extract_date(user_text),
        "time": extract_time(user_text),
        "num_guests": extract_num_guests(user_text),
        "price_range": extract_price_range(user_text),
        "booking_status": extract_booking_status(user_text)
    }