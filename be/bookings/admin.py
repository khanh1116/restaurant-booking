# bookings/admin.py
from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'customer', 'restaurant', 'booking_date',
        'time_slot', 'number_of_guests', 'status', 'created_at'
    ]
    list_filter = ['status', 'booking_date', 'created_at']
    search_fields = [
        'customer__full_name', 'customer__phone_number',
        'restaurant__name', 'special_request'
    ]
    readonly_fields = ['created_at', 'confirmed_at']
    date_hierarchy = 'booking_date'
    
    fieldsets = (
        ('Thông tin cơ bản', {
            'fields': ('customer', 'restaurant', 'time_slot')
        }),
        ('Chi tiết đặt bàn', {
            'fields': ('booking_date', 'number_of_guests', 'special_request')
        }),
        ('Trạng thái', {
            'fields': ('status', 'created_at', 'confirmed_at')
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('customer', 'restaurant', 'time_slot')
    
    # Actions
    actions = ['mark_as_confirmed', 'mark_as_completed', 'mark_as_cancelled']
    
    def mark_as_confirmed(self, request, queryset):
        updated = queryset.filter(status='PENDING').update(status='CONFIRMED')
        self.message_user(request, f'{updated} booking(s) đã được xác nhận')
    mark_as_confirmed.short_description = "Xác nhận các booking đã chọn"
    
    def mark_as_completed(self, request, queryset):
        updated = queryset.filter(status='CONFIRMED').update(status='COMPLETED')
        self.message_user(request, f'{updated} booking(s) đã được đánh dấu hoàn thành')
    mark_as_completed.short_description = "Đánh dấu hoàn thành"
    
    def mark_as_cancelled(self, request, queryset):
        updated = queryset.filter(status__in=['PENDING', 'CONFIRMED']).update(status='CANCELLED')
        self.message_user(request, f'{updated} booking(s) đã bị hủy')
    mark_as_cancelled.short_description = "Hủy các booking đã chọn"