# chatbot/services/query_handler.py
"""
Query Handler - Xử lý DB_QUERY intents
MERGED từ intent_handlers.py (Python) → Django
"""
from datetime import datetime, date, time as dt_time
from django.conf import settings

from chatbot.services.slot_extractor import (
    extract_restaurant,
    extract_date,
    extract_time,
    extract_dish_name,
    extract_category,
    extract_location,
    extract_num_guests
)
from chatbot.utils.db_queries import (
    fetch_opening_hours,
    fetch_time_slots,
    fetch_address,
    fetch_phone,
    fetch_menu_items,
    fetch_rating,
    search_restaurants_by_location,  # Dùng search_* thay vì fetch_*
    get_connection,
    get_restaurant_by_name,
    get_restaurant_by_id,
    check_availability,
    get_time_slots
)
from restaurants.models import TimeSlot


class QueryHandler:
    """
    Handle DB_QUERY intents
    Extract slots → Query DB → Fill answer template → Return
    """
    
    def __init__(self):
        self.fallback_message = settings.CHATBOT_CONFIG.get(
            'FALLBACK_MESSAGE', 
            'Tôi chưa hiểu câu hỏi lắm, bạn nói rõ hơn được không?'
        )
    
    def handle(self, intent_result, slots, user_text=None):
        """
        Handle DB_QUERY question
        
        Args:
            intent_result: dict từ IntentDetector
            slots: dict từ SlotExtractor
            user_text: str - câu hỏi gốc (để extract lại nếu cần)
        
        Returns:
            {
                'answer': str,
                'type': 'DB_QUERY' | 'ASK_SLOT' | 'ASK_CONFIRM' | 'ERROR',
                'data': dict (optional)
            }
        """
        intent = intent_result.get('intent')
        answer_template = intent_result.get('answer_template', '')
        
        # Lưu user_text để các handler có thể extract lại
        self.user_text = user_text or slots.get('_raw_text', '')
        
        # Route to specific handler
        handler_map = {
            'ASK_OPENING_HOURS': self._handle_ask_opening_hours,
            'ASK_TIME_SLOTS': self._handle_ask_time_slots,
            'ASK_ADDRESS': self._handle_ask_address,
            'ASK_PHONE': self._handle_ask_phone,
            'ASK_MENU': self._handle_ask_menu,
            'ASK_DISH_PRICE': self._handle_ask_dish_price,
            'ASK_MENU_BY_CATEGORY': self._handle_ask_menu_by_category,
            'SEARCH_RESTAURANT_BY_LOCATION': self._handle_search_restaurant_by_location,
            'ASK_RATING': self._handle_ask_rating,
            'CHECK_AVAILABILITY_SIMPLE': self._handle_check_availability_simple,
        }
        
        handler = handler_map.get(intent)
        
        if not handler:
            return {
                'answer': f'Intent "{intent}" hiện chưa được hỗ trợ.',
                'type': 'ERROR'
            }
        
        return handler(answer_template)
    
    # ==================== HELPER FUNCTIONS ====================
    
    def _fill_template(self, template: str, mapping: dict) -> str:
        """Fill template với mapping values"""
        result = template or ""
        for key, value in mapping.items():
            result = result.replace(f"[{key}]", str(value))
        return result
    
    def _format_time_slot_row(self, row: dict) -> str:
        """Format time slot row thành string"""
        st = row.get("start_time")
        et = row.get("end_time")
        
        def _fmt(t):
            if t is None:
                return ""
            if hasattr(t, "strftime"):
                return t.strftime("%H:%M")
            return str(t)
        
        return f"{_fmt(st)}-{_fmt(et)}"
    
    # ==================== INTENT HANDLERS ====================
    
    def _handle_ask_opening_hours(self, answer_template: str) -> dict:
        """
        ASK_OPENING_HOURS: "Nhà hàng ABC mở cửa mấy giờ?"
        """
        conn = get_connection()
        res_info = extract_restaurant(self.user_text, conn)
        status = res_info.get("status")
        restaurant = res_info.get("restaurant")
        
        if status == "NO_DATA":
            return {
                'answer': "Hiện tại em chưa có dữ liệu nhà hàng trong hệ thống ạ.",
                'type': 'ERROR'
            }
        
        if status == "ASK_NAME" or not restaurant:
            return {
                'answer': "Em chưa xác định được tên nhà hàng, anh/chị cho em xin tên nhà hàng cụ thể với ạ?",
                'type': 'ASK_SLOT'
            }
        
        res_name = restaurant.get("name", "")
        
        # OK - Query DB
        opening = fetch_opening_hours(restaurant["id"])
        if not opening:
            return {
                'answer': f"Em chưa tìm thấy giờ mở cửa của nhà hàng {res_name} ạ.",
                'type': 'ERROR'
            }
        
        answer = self._fill_template(answer_template, {
            "RES_NAME": res_name,
            "OPENING_HOURS": opening,
        })
        
        return {'answer': answer, 'type': 'DB_QUERY'}
    
    def _handle_ask_time_slots(self, answer_template: str) -> dict:
        """
        ASK_TIME_SLOTS: "Nhà hàng ABC có khung giờ nào?"
        """
        conn = get_connection()
        res_info = extract_restaurant(self.user_text, conn)
        status = res_info.get("status")
        restaurant = res_info.get("restaurant")
        
        if status == "NO_DATA":
            return {
                'answer': "Hiện tại em chưa có dữ liệu nhà hàng trong hệ thống ạ.",
                'type': 'ERROR'
            }
        
        if status == "ASK_NAME" or not restaurant:
            return {
                'answer': "Anh/chị cho em xin tên nhà hàng để em xem các khung giờ phục vụ với ạ?",
                'type': 'ASK_SLOT'
            }
        
        res_name = restaurant.get("name", "")
        
        # Query time slots
        slots = fetch_time_slots(restaurant["id"])
        if not slots:
            return {
                'answer': f"Hiện tại em chưa thấy cấu hình khung giờ cho nhà hàng {res_name} ạ.",
                'type': 'ERROR'
            }
        
        slot_strs = [self._format_time_slot_row(r) for r in slots if r]
        time_slots_text = ", ".join(s for s in slot_strs if s)
        
        booking_date = extract_date(self.user_text) or "ngày anh/chị chọn"
        
        answer = self._fill_template(answer_template, {
            "RES_NAME": res_name,
            "BOOKING_DATE": booking_date,
            "TIME_SLOTS": time_slots_text,
        })
        
        return {'answer': answer, 'type': 'DB_QUERY'}
    
    def _handle_ask_address(self, answer_template: str) -> dict:
        """
        ASK_ADDRESS: "Nhà hàng ABC ở đâu?"
        """
        conn = get_connection()
        res_info = extract_restaurant(self.user_text, conn)
        status = res_info.get("status")
        restaurant = res_info.get("restaurant")
        
        if status == "NO_DATA":
            return {
                'answer': "Hiện tại em chưa có dữ liệu nhà hàng trong hệ thống ạ.",
                'type': 'ERROR'
            }
        
        if status == "ASK_NAME" or not restaurant:
            return {
                'answer': "Anh/chị cho em xin tên nhà hàng để em kiểm tra địa chỉ với ạ?",
                'type': 'ASK_SLOT'
            }
        
        res_name = restaurant.get("name", "")
        
        # Query address
        address = fetch_address(restaurant["id"])
        if not address:
            return {
                'answer': f"Em chưa tìm thấy địa chỉ của nhà hàng {res_name} ạ.",
                'type': 'ERROR'
            }
        
        answer = self._fill_template(answer_template, {
            "RES_NAME": res_name,
            "ADDRESS": address,
        })
        
        return {'answer': answer, 'type': 'DB_QUERY'}
    
    def _handle_ask_phone(self, answer_template: str) -> dict:
        """
        ASK_PHONE: "Số điện thoại nhà hàng ABC?"
        """
        conn = get_connection()
        res_info = extract_restaurant(self.user_text, conn)
        status = res_info.get("status")
        restaurant = res_info.get("restaurant")
        
        if status == "NO_DATA":
            return {
                'answer': "Hiện tại em chưa có dữ liệu nhà hàng trong hệ thống ạ.",
                'type': 'ERROR'
            }
        
        if status == "ASK_NAME" or not restaurant:
            return {
                'answer': "Anh/chị cho em xin tên nhà hàng để em kiểm tra số điện thoại với ạ?",
                'type': 'ASK_SLOT'
            }
        
        res_name = restaurant.get("name", "")
        
        # Query phone
        phone = fetch_phone(restaurant["id"])
        if not phone:
            return {
                'answer': f"Em chưa tìm thấy số điện thoại của nhà hàng {res_name} ạ.",
                'type': 'ERROR'
            }
        
        answer = self._fill_template(answer_template, {
            "RES_NAME": res_name,
            "PHONE": phone,
        })
        
        return {'answer': answer, 'type': 'DB_QUERY'}
    
    def _handle_ask_menu(self, answer_template: str) -> dict:
        """
        ASK_MENU: "Nhà hàng ABC có món gì?"
        Return: skip_vit5 = True (không qua ViT5)
        """
        conn = get_connection()
        res_info = extract_restaurant(self.user_text, conn)
        status = res_info.get("status")
        restaurant = res_info.get("restaurant")
        
        if status == "NO_DATA":
            return {
                'answer': "Hiện tại em chưa có dữ liệu nhà hàng trong hệ thống ạ.",
                'type': 'ERROR'
            }
        
        if status == "ASK_NAME" or not restaurant:
            return {
                'answer': "Anh/chị cho em xin tên nhà hàng để em xem menu với ạ?",
                'type': 'ASK_SLOT'
            }
        
        res_name = restaurant.get("name", "")
        
        # Query menu
        dishes = fetch_menu_items(restaurant["id"])
        
        if not dishes:
            return {
                'answer': f"Hiện tại nhà hàng {res_name} chưa cập nhật menu ạ.",
                'type': 'ERROR'
            }
        
        # Group by category
        by_cat = {}
        for d in dishes:
            cat = d.get("category") or "Khác"
            if cat not in by_cat:
                by_cat[cat] = []
            by_cat[cat].append(d)
        
        # Build MENU_LIST - Format liệt kê dễ nhìn
        menu_parts = [f"Menu tại {res_name}:"]
        for cat, items in by_cat.items():
            menu_parts.append(f"\n📌 {cat}:")
            for idx, item in enumerate(items[:5], 1):  # Giới hạn 5 món/category
                price = f"{int(item['price']):,}đ" if item.get('price') else "Liên hệ"
                menu_parts.append(f"  {idx}. {item['name']}: {price}")
        
        answer = "\n".join(menu_parts)
        
        return {
            'answer': answer, 
            'type': 'DB_QUERY',
            'skip_vit5': True  # 🆕 Bỏ qua ViT5 - trả về luôn
        }
    
    def _handle_ask_dish_price(self, answer_template: str) -> dict:
        """
        ASK_DISH_PRICE: "Giá phở bò bao nhiêu?"
        """
        conn = get_connection()
        dish_info = extract_dish_name(self.user_text, conn)
        status = dish_info.get("status")
        dish = dish_info.get("dish")
        
        if status == "NO_DATA":
            return {
                'answer': "Em chưa tìm thấy món ăn nào trong hệ thống ạ.",
                'type': 'ERROR'
            }
        
        if status == "ASK_DISH" or not dish:
            return {
                'answer': "Anh/chị cho em xin tên món để em kiểm tra giá với ạ?",
                'type': 'ASK_SLOT'
            }
        
        dish_name = dish.get("name", "")
        
        # Query price
        price = dish.get("price")
        if not price:
            return {
                'answer': f"Món {dish_name} chưa có giá, anh/chị vui lòng liên hệ nhà hàng ạ.",
                'type': 'ERROR'
            }
        
        price_formatted = f"{int(price):,}đ"
        
        answer = self._fill_template(answer_template, {
            "DISH_NAME": dish_name,
            "PRICE": price_formatted,
        })
        
        return {'answer': answer, 'type': 'DB_QUERY'}
    
    def _handle_ask_menu_by_category(self, answer_template: str) -> dict:
        """
        ASK_MENU_BY_CATEGORY: "Có món tráng miệng không?"
        Return: skip_vit5 = True (không qua ViT5)
        """
        conn = get_connection()
        
        # Extract restaurant
        res_info = extract_restaurant(self.user_text, conn)
        status = res_info.get("status")
        restaurant = res_info.get("restaurant")
        
        if status == "NO_DATA":
            return {
                'answer': "Hiện tại em chưa có dữ liệu nhà hàng trong hệ thống ạ.",
                'type': 'ERROR'
            }
        
        if status == "ASK_NAME" or not restaurant:
            return {
                'answer': "Anh/chị cho em xin tên nhà hàng để em xem menu với ạ?",
                'type': 'ASK_SLOT'
            }
        
        res_name = restaurant.get("name", "")
        
        # Extract category
        cat_info = extract_category(self.user_text, conn)
        category = cat_info.get("category")
        
        if not category:
            # Không có category cụ thể -> trả tất cả menu
            dishes = fetch_menu_items(restaurant["id"])
            if not dishes:
                return {
                    'answer': f"Hiện tại nhà hàng {res_name} chưa cập nhật menu ạ.",
                    'type': 'ERROR'
                }
            
            # Group by category
            by_cat = {}
            for d in dishes:
                cat = d.get("category") or "Khác"
                if cat not in by_cat:
                    by_cat[cat] = []
                by_cat[cat].append(d)
            
            result_parts = [f"Menu nhà hàng {res_name}:"]
            for cat, items in by_cat.items():
                result_parts.append(f"\n📌 {cat}:")
                for idx, item in enumerate(items[:5], 1):  # Giới hạn 5 món/category
                    price = f"{int(item['price']):,}đ" if item.get('price') else "Liên hệ"
                    result_parts.append(f"  {idx}. {item['name']}: {price}")
            
            return {
                'answer': "\n".join(result_parts), 
                'type': 'DB_QUERY',
                'skip_vit5': True  # 🆕 Bỏ qua ViT5
            }
        
        # Có category cụ thể
        dishes = fetch_menu_items(restaurant["id"])
        filtered_dishes = [d for d in dishes if d.get("category") == category]
        
        if not filtered_dishes:
            return {
                'answer': f"Hiện tại nhà hàng {res_name} chưa có món {category} ạ.",
                'type': 'ERROR'
            }
        
        # Tạo danh sách món
        result_parts = [f"Các món {category} tại {res_name}:"]
        for idx, d in enumerate(filtered_dishes[:5], 1):  # Giới hạn 5 món
            price = f"{int(d['price']):,}đ" if d.get('price') else "Liên hệ"
            result_parts.append(f"{idx}. {d['name']}: {price}")
        
        answer = "\n".join(result_parts)
        
        return {
            'answer': answer, 
            'type': 'DB_QUERY',
            'skip_vit5': True  # 🆕 Bỏ qua ViT5
        }
    
    def _handle_search_restaurant_by_location(self, answer_template: str) -> dict:
        """
        SEARCH_RESTAURANT_BY_LOCATION: "Có nhà hàng nào ở quận 1?"
        Format: Liệt kê như menu (dễ nhìn)
        Return: skip_vit5 = True (không qua ViT5)
        """
        conn = get_connection()
        loc_info = extract_location(self.user_text, conn)
        
        # Lấy location cao nhất theo thứ tự priority: district > city > ward
        city = loc_info.get("city")
        district = loc_info.get("district")
        ward = loc_info.get("ward")
        
        if not (city or district or ward):
            return {
                'answer': "Anh/chị muốn tìm nhà hàng ở đâu ạ?",
                'type': 'ASK_SLOT'
            }
        
        restaurants = search_restaurants_by_location(city, district, ward)
        
        if not restaurants:
            location_display = ward or district or city or "khu vực đó"
            return {
                'answer': f"Em chưa tìm thấy nhà hàng nào tại {location_display} ạ.",
                'type': 'ERROR'
            }
        
        # Build RESTAURANT_LIST - Format như menu (dễ nhìn)
        location_display = ward or district or city or ""
        
        result_parts = [f"Các nhà hàng ở {location_display}:"]
        for idx, r in enumerate(restaurants[:5], 1):  # Giới hạn 5 nhà hàng
            result_parts.append(f"{idx}. {r.name}")
            result_parts.append(f"   Địa chỉ: {r.address}")
        
        answer = "\n".join(result_parts)
        
        return {
            'answer': answer, 
            'type': 'DB_QUERY',
            'skip_vit5': True  # 🆕 Bỏ qua ViT5 - trả về luôn
        }
    
    def _handle_ask_rating(self, answer_template: str) -> dict:
        """
        ASK_RATING: "Nhà hàng ABC được đánh giá thế nào?"
        """
        conn = get_connection()
        res_info = extract_restaurant(self.user_text, conn)
        status = res_info.get("status")
        restaurant = res_info.get("restaurant")
        
        if status == "NO_DATA":
            return {
                'answer': "Hiện tại em chưa có dữ liệu nhà hàng trong hệ thống ạ.",
                'type': 'ERROR'
            }
        
        if status == "ASK_NAME" or not restaurant:
            return {
                'answer': "Anh/chị cho em xin tên nhà hàng để em kiểm tra đánh giá với ạ?",
                'type': 'ASK_SLOT'
            }
        
        res_name = restaurant.get("name", "")
        
        # Query rating
        rating = fetch_rating(restaurant["id"])
        
        if rating is None:
            return {
                'answer': f"Nhà hàng {res_name} chưa có đánh giá ạ.",
                'type': 'ERROR'
            }
        
        return {
            'answer': f"Nhà hàng {res_name} được đánh giá {rating}/5 sao ạ.",
            'type': 'DB_QUERY'
        }
    
    def _handle_check_availability_simple(self, answer_template: str) -> dict:
        """
        CHECK_AVAILABILITY_SIMPLE: "Ngày 25/12 lúc 19:00 còn bàn không?"
        """
        conn = get_connection()
        res_info = extract_restaurant(self.user_text, conn)
        status = res_info.get("status")
        restaurant = res_info.get("restaurant")
        
        if status == "NO_DATA":
            return {
                'answer': "Hiện tại em chưa có dữ liệu nhà hàng trong hệ thống ạ.",
                'type': 'ERROR'
            }
        
        if status == "ASK_NAME" or not restaurant:
            return {
                'answer': "Anh/chị cho em xin tên nhà hàng để em kiểm tra ạ?",
                'type': 'ASK_SLOT'
            }
        
        res_name = restaurant.get("name", "")
        
        # Extract date & time
        date_str = extract_date(self.user_text)
        time_str = extract_time(self.user_text)
        
        if not date_str or not time_str:
            return {
                'answer': f"Anh/chị cho em biết ngày giờ muốn đặt tại {res_name} để em kiểm tra ạ?",
                'type': 'ASK_SLOT'
            }
        
        answer = self._fill_template(answer_template, {
            "RES_NAME": res_name,
            "DATE": date_str,
            "TIME": time_str,
        })
        
        return {'answer': answer, 'type': 'DB_QUERY'}