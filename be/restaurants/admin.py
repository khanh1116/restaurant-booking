# restaurants/admin.py
from django.contrib import admin
from .models import Location, Restaurant, RestaurantImage, MenuItem, TimeSlot


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ['id', 'city', 'district', 'ward', 'get_full_address']
    search_fields = ['city', 'district', 'ward']
    list_filter = ['city']


class RestaurantImageInline(admin.TabularInline):
    model = RestaurantImage
    extra = 1
    fields = ['image', 'display_order']


class MenuItemInline(admin.TabularInline):
    model = MenuItem
    extra = 1
    fields = ['name', 'price', 'category', 'is_available']


class TimeSlotInline(admin.TabularInline):
    model = TimeSlot
    extra = 1
    fields = ['start_time', 'end_time', 'max_bookings', 'is_active']


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'name', 'partner', 'location',
        'status', 'rating', 'created_at'
    ]
    list_filter = ['status', 'location__city', 'created_at']
    search_fields = ['name', 'address', 'partner__business_name']
    readonly_fields = ['created_at', 'updated_at', 'rating']
    inlines = [RestaurantImageInline, MenuItemInline, TimeSlotInline]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('partner', 'name', 'address', 'phone_number', 'location')
        }),
        ('Details', {
            'fields': ('description', 'opening_hours', 'slot_duration')
        }),
        ('Status', {
            'fields': ('status', 'rating')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['approve_restaurants', 'suspend_restaurants', 'close_restaurants']
    
    def approve_restaurants(self, request, queryset):
        """
        Approve selected restaurants - FIXED VERSION
        Dùng .save() thay vì .update() để trigger signals
        """
        updated = 0
        for restaurant in queryset:
            if restaurant.status != 'APPROVED':
                restaurant.status = 'APPROVED'
                restaurant.save()  # ← Trigger pre_save và post_save signals
                updated += 1
        
        self.message_user(request, f'{updated} restaurants approved and notifications sent.')
    approve_restaurants.short_description = "Approve selected restaurants"
    
    def suspend_restaurants(self, request, queryset):
        """
        Suspend selected restaurants - FIXED VERSION
        Dùng .save() thay vì .update() để trigger signals
        """
        updated = 0
        for restaurant in queryset:
            if restaurant.status != 'SUSPENDED':
                restaurant.status = 'SUSPENDED'
                restaurant.save()  # ← Trigger pre_save và post_save signals
                updated += 1
        
        self.message_user(request, f'{updated} restaurants suspended and notifications sent.')
    suspend_restaurants.short_description = "Suspend selected restaurants"
    
    def close_restaurants(self, request, queryset):
        """
        Close selected restaurants - NEW ACTION
        Dùng .save() thay vì .update() để trigger signals
        """
        updated = 0
        for restaurant in queryset:
            if restaurant.status != 'CLOSED':
                restaurant.status = 'CLOSED'
                restaurant.save()  # ← Trigger pre_save và post_save signals
                updated += 1
        
        self.message_user(request, f'{updated} restaurants closed and notifications sent.')
    close_restaurants.short_description = "Close selected restaurants"


@admin.register(RestaurantImage)
class RestaurantImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'restaurant', 'image_url', 'display_order']
    list_filter = ['restaurant']
    search_fields = ['restaurant__name']


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'name', 'restaurant', 'category',
        'price', 'is_available'
    ]
    list_filter = ['category', 'is_available', 'restaurant']
    search_fields = ['name', 'restaurant__name']


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'restaurant', 'start_time', 'end_time',
        'max_bookings', 'is_active'
    ]
    list_filter = ['is_active', 'restaurant']
    search_fields = ['restaurant__name']