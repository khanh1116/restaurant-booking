# notifications/admin.py
from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_display', 'title', 'type', 'is_read', 'sent_at']
    list_filter = ['type', 'is_read', 'sent_at']
    search_fields = ['user__phone_number', 'user__full_name', 'title', 'message']
    readonly_fields = ['sent_at']
    date_hierarchy = 'sent_at'
    
    fieldsets = (
        ('Thông tin cơ bản', {
            'fields': ('user', 'title', 'message', 'type')
        }),
        ('Trạng thái', {
            'fields': ('is_read', 'sent_at')
        }),
        ('Liên kết', {
            'fields': ('related_object_type', 'related_object_id'),
            'classes': ('collapse',)
        }),
    )
    
    def user_display(self, obj):
        return obj.user.full_name or obj.user.phone_number
    user_display.short_description = 'Người nhận'
    
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f'Đã đánh dấu {updated} thông báo là đã đọc.')
    mark_as_read.short_description = 'Đánh dấu đã đọc'
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f'Đã đánh dấu {updated} thông báo là chưa đọc.')
    mark_as_unread.short_description = 'Đánh dấu chưa đọc'