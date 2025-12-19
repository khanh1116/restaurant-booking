# chatbot/utils/db_queries.py
"""
Database query helpers - FULL VERSION
Chuyển từ pymysql sang Django ORM - ĐẦY ĐỦ
"""
from accounts.models import User, Customer, Partner
from restaurants.models import Restaurant, MenuItem, Location, TimeSlot
from bookings.models import Booking
from django.db.models import Q, Count
from datetime import datetime
from rapidfuzz import fuzz, process


# ==================== CONNECTION HELPER ====================

class MockConnection:
    """
    Mock connection object để tương thích với code Python cũ
    Không dùng pymysql nữa
    """
    def __enter__(self):
        return self
    
    def __exit__(self, *args):
        pass
    
    def close(self):
        pass


def get_connection():
    """
    🆕 Tương thích với code cũ
    Trả về mock connection (không dùng pymysql)
    """
    return MockConnection()


# ==================== RESTAURANT QUERIES ====================

def get_restaurant_by_name(name, threshold=80):
    """
    Tìm restaurant theo tên (dùng RapidFuzz)
    Returns: Restaurant object hoặc None
    """
    all_restaurants = Restaurant.objects.filter(status='APPROVED').values_list('id', 'name')
    restaurant_dict = {r[1]: r[0] for r in all_restaurants}
    
    if not restaurant_dict:
        return None
    
    match = process.extractOne(name, restaurant_dict.keys(), scorer=fuzz.WRatio)
    
    if match and match[1] >= threshold:
        restaurant_id = restaurant_dict[match[0]]
        return Restaurant.objects.get(id=restaurant_id)
    
    return None


def get_restaurant_by_id(restaurant_id):
    """Lấy restaurant theo ID"""
    try:
        return Restaurant.objects.get(id=restaurant_id, status='APPROVED')
    except Restaurant.DoesNotExist:
        return None


def fetch_all_restaurants():
    """
    Lấy tất cả restaurants (APPROVED)
    Returns: List[dict] với id, name
    """
    return list(Restaurant.objects.filter(
        status='APPROVED'
    ).values('id', 'name'))


def fetch_rating(restaurant_id):
    """
    Lấy rating của nhà hàng
    Returns: float hoặc None
    """
    try:
        restaurant = Restaurant.objects.get(id=restaurant_id)
        return float(restaurant.rating) if restaurant.rating else None
    except Restaurant.DoesNotExist:
        return None


def fetch_opening_hours(restaurant_id):
    """
    Lấy opening_hours của nhà hàng
    Returns: str hoặc None
    """
    try:
        restaurant = Restaurant.objects.get(id=restaurant_id)
        return restaurant.opening_hours
    except Restaurant.DoesNotExist:
        return None


def fetch_address(restaurant_id):
    """
    Lấy address của nhà hàng
    Returns: str hoặc None
    """
    try:
        restaurant = Restaurant.objects.get(id=restaurant_id)
        return restaurant.address
    except Restaurant.DoesNotExist:
        return None


def fetch_phone(restaurant_id):
    """
    Lấy phone_number của nhà hàng
    Returns: str hoặc None
    """
    try:
        restaurant = Restaurant.objects.get(id=restaurant_id)
        return restaurant.phone_number
    except Restaurant.DoesNotExist:
        return None


# ==================== LOCATION QUERIES ====================

def get_location_match(text, field='district', threshold=75):
    """
    Tìm location (city/district) từ text
    field: 'city' hoặc 'district'
    Returns: str hoặc None
    """
    if field == 'city':
        values = Location.objects.values_list('city', flat=True).distinct()
    else:
        values = Location.objects.values_list('district', flat=True).distinct()
    
    values = [v for v in values if v]
    
    if not values:
        return None
    
    match = process.extractOne(text, values, scorer=fuzz.WRatio)
    
    if match and match[1] >= threshold:
        return match[0]
    
    return None


def fetch_all_locations():
    """
    Lấy tất cả locations từ DB
    Returns: List[dict] với id, city, district, ward
    """
    return list(Location.objects.values('id', 'city', 'district', 'ward'))


def search_restaurants_by_location(city=None, district=None, ward=None, limit=10):
    """
    Tìm nhà hàng theo địa điểm
    Returns: QuerySet
    """
    query = Q(status='APPROVED')
    
    if city:
        query &= Q(location__city=city)
    
    if district:
        query &= Q(location__district=district)
    
    if ward:
        query &= Q(location__ward=ward)
    
    return Restaurant.objects.filter(query).select_related('location')[:limit]


def fetch_restaurants_by_location(city=None, district=None, ward=None, limit=10):
    """
    🆕 Alias cho search_restaurants_by_location
    Để tương thích với code Python cũ
    Returns: QuerySet
    """
    return search_restaurants_by_location(city, district, ward, limit)


# ==================== MENU QUERIES ====================

def get_menu_items(restaurant_id, category=None, dish_name=None):
    """
    Lấy menu items (trả về QuerySet)
    Returns: QuerySet
    """
    query = Q(restaurant_id=restaurant_id, is_available=True)
    
    if category:
        # Fuzzy match category
        all_categories = MenuItem.objects.filter(
            restaurant_id=restaurant_id
        ).values_list('category', flat=True).distinct()
        
        all_categories = [c for c in all_categories if c]
        
        if all_categories:
            match = process.extractOne(category, all_categories, scorer=fuzz.WRatio)
            if match and match[1] >= 70:
                query &= Q(category=match[0])
    
    if dish_name:
        # Fuzzy match dish name
        query &= Q(name__icontains=dish_name)
    
    return MenuItem.objects.filter(query)


def fetch_menu_items(restaurant_id=None):
    """
    Lấy menu items (trả về List[dict])
    Nếu restaurant_id = None -> lấy tất cả
    Returns: List[dict]
    """
    if restaurant_id is None:
        items = MenuItem.objects.filter(is_available=True)
    else:
        items = MenuItem.objects.filter(
            restaurant_id=restaurant_id,
            is_available=True
        )
    
    return list(items.values(
        'id', 'restaurant_id', 'name', 'description', 
        'price', 'category', 'is_available'
    ))


def fetch_categories():
    """
    Lấy danh sách categories unique từ menu_items
    Returns: List[str]
    """
    categories = MenuItem.objects.filter(
        category__isnull=False
    ).exclude(
        category=''
    ).values_list('category', flat=True).distinct()
    
    return list(categories)


# ==================== TIME SLOTS ====================

def get_time_slots(restaurant_id, date=None):
    """
    Lấy time slots của restaurant
    Nếu có date → tính availability
    Returns: List[dict]
    """
    slots = TimeSlot.objects.filter(
        restaurant_id=restaurant_id,
        is_active=True
    ).order_by('start_time')
    
    result = []
    
    for slot in slots:
        slot_data = {
            'id': slot.id,
            'start_time': slot.start_time.strftime('%H:%M'),
            'end_time': slot.end_time.strftime('%H:%M'),
            'max_bookings': slot.max_bookings,
        }
        
        if date:
            booked_count = Booking.objects.filter(
                restaurant_id=restaurant_id,
                booking_date=date,
                time_slot_id=slot.id,
                status__in=['PENDING', 'CONFIRMED']
            ).count()
            
            slot_data['booked'] = booked_count
            slot_data['available'] = slot.max_bookings - booked_count
        
        result.append(slot_data)
    
    return result


def fetch_time_slots(restaurant_id):
    """
    Lấy time slots (tương thích code Python cũ)
    Returns: List[dict] với start_time, end_time (datetime objects)
    """
    slots = TimeSlot.objects.filter(
        restaurant_id=restaurant_id,
        is_active=True
    ).order_by('start_time')
    
    return list(slots.values('start_time', 'end_time'))


# ==================== AVAILABILITY ====================

def check_availability(restaurant_id, date, time_slot_id=None):
    """
    Kiểm tra availability
    Nếu không có time_slot_id → trả tất cả slots
    Returns: dict
    """
    restaurant = get_restaurant_by_id(restaurant_id)
    
    if not restaurant:
        return {'error': 'Nhà hàng không tồn tại'}
    
    if time_slot_id:
        # Check specific slot
        try:
            slot = TimeSlot.objects.get(id=time_slot_id, restaurant_id=restaurant_id)
        except TimeSlot.DoesNotExist:
            return {'error': 'Khung giờ không tồn tại'}
        
        booked = Booking.objects.filter(
            restaurant_id=restaurant_id,
            booking_date=date,
            time_slot_id=time_slot_id,
            status__in=['PENDING', 'CONFIRMED']
        ).count()
        
        available = slot.max_bookings - booked
        
        return {
            'restaurant_name': restaurant.name,
            'date': date.strftime('%d/%m/%Y') if hasattr(date, 'strftime') else str(date),
            'time_slot': f"{slot.start_time.strftime('%H:%M')}-{slot.end_time.strftime('%H:%M')}",
            'available': available,
            'max': slot.max_bookings,
            'status': 'available' if available > 0 else 'full'
        }
    
    else:
        # Return all slots
        slots = get_time_slots(restaurant_id, date)
        return {
            'restaurant_name': restaurant.name,
            'date': date.strftime('%d/%m/%Y') if hasattr(date, 'strftime') else str(date),
            'slots': slots
        }