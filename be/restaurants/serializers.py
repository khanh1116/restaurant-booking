#restaurants/serializers.py
from rest_framework import serializers
from .models import Location, Restaurant, RestaurantImage, MenuItem, TimeSlot
from accounts.models import Partner


class LocationSerializer(serializers.ModelSerializer):
    full_address = serializers.CharField(source='get_full_address', read_only=True)

    class Meta:
        model = Location
        fields = ['id', 'city', 'district', 'ward', 'full_address']


class RestaurantImageSerializer(serializers.ModelSerializer):
    """Serializer cho RestaurantImage - chỉ trả về path tương đối"""
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = RestaurantImage
        fields = ['id', 'image_url', 'display_order', 'created_at']
        read_only_fields = ['created_at']
    
    def get_image_url(self, obj):
        """Trả về path tương đối: restaurant_images/abc.jpg"""
        return obj.image_url if obj.image else ''


class MenuItemSerializer(serializers.ModelSerializer):
    """Serializer cho MenuItem - chỉ trả về path tương đối"""
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MenuItem
        fields = [
            'id', 'name', 'description', 'price',
            'image_url', 'category', 'is_available',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_image_url(self, obj):
        """Trả về path tương đối: menu_items/abc.jpg"""
        return obj.image_url if obj.image else ''


class MenuItemCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer riêng cho create/update MenuItem (không upload ảnh)"""
    class Meta:
        model = MenuItem
        fields = [
            'name', 'description', 'price',
            'category', 'is_available'
        ]


class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = [
            'id', 'start_time', 'end_time',
            'max_bookings', 'is_active'
        ]

    def validate(self, data):
        """Validate start_time < end_time"""
        if data.get('start_time') and data.get('end_time'):
            if data['start_time'] >= data['end_time']:
                raise serializers.ValidationError({
                    'end_time': 'End time must be after start time'
                })
        return data


class RestaurantListSerializer(serializers.ModelSerializer):
    """Serializer cho danh sách nhà hàng (không có chi tiết)"""
    location = LocationSerializer(read_only=True)
    partner_name = serializers.CharField(
        source='partner.business_name',
        read_only=True
    )
    image_count = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = [
            'id', 'name', 'address', 'phone_number',
            'description', 'opening_hours', 'status',
            'rating', 'location', 'partner_name',
            'image_count', 'created_at'
        ]

    def get_image_count(self, obj):
        return obj.images.count()


class RestaurantDetailSerializer(serializers.ModelSerializer):
    """Serializer chi tiết nhà hàng (có images, menu, time_slots)"""
    location = LocationSerializer(read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(),
        source='location',
        write_only=True,
        required=False
    )
    partner_name = serializers.CharField(
        source='partner.business_name',
        read_only=True
    )
    images = RestaurantImageSerializer(many=True, read_only=True)
    menu_items = MenuItemSerializer(many=True, read_only=True)
    time_slots = TimeSlotSerializer(many=True, read_only=True)

    class Meta:
        model = Restaurant
        fields = [
            'id', 'partner', 'partner_name', 'name', 'address',
            'phone_number', 'description', 'opening_hours',
            'slot_duration', 'status', 'rating', 'location',
            'location_id', 'images', 'menu_items', 'time_slots',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['partner', 'status', 'rating', 'created_at', 'updated_at']

    def validate_phone_number(self, value):
        """Validate phone number format"""
        if value and not value.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits")
        if value and (len(value) < 10 or len(value) > 11):
            raise serializers.ValidationError("Phone number must be 10-11 digits")
        return value


class RestaurantCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer cho create/update nhà hàng (không có nested objects)"""
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(),
        source='location',
        required=False
    )

    class Meta:
        model = Restaurant
        fields = [
            'name', 'address', 'phone_number', 'description',
            'opening_hours', 'slot_duration', 'location_id'
        ]

    def validate_phone_number(self, value):
        if value and not value.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits")
        if value and (len(value) < 10 or len(value) > 11):
            raise serializers.ValidationError("Phone number must be 10-11 digits")
        return value


class TimeSlotAvailabilitySerializer(serializers.Serializer):
    """Serializer để check slot availability"""
    restaurant_id = serializers.IntegerField()
    date = serializers.DateField()
    time_slot_id = serializers.IntegerField(required=False)

    def validate_restaurant_id(self, value):
        if not Restaurant.objects.filter(id=value, status='APPROVED').exists():
            raise serializers.ValidationError("Restaurant not found or not approved")
        return value

    def validate_time_slot_id(self, value):
        if value and not TimeSlot.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Time slot not found or inactive")
        return value