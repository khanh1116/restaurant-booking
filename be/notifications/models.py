# notifications/models.py
from django.db import models
from accounts.models import User


class Notification(models.Model):
    """
    Model thông báo cho user
    Tự động gửi khi có sự kiện: booking created/confirmed/rejected/cancelled, restaurant approved
    """
    
    TYPE_CHOICES = [
        ('BOOKING', 'Booking'),
        ('RESTAURANT', 'Restaurant'),
        ('SYSTEM', 'System'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Người nhận'
    )
    title = models.CharField(max_length=150, verbose_name='Tiêu đề')
    message = models.TextField(verbose_name='Nội dung')
    type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        default='SYSTEM',
        verbose_name='Loại thông báo'
    )
    sent_at = models.DateTimeField(auto_now_add=True, verbose_name='Thời gian gửi')
    is_read = models.BooleanField(default=False, verbose_name='Đã đọc')
    
    # Optional: reference đến object liên quan (booking, restaurant)
    related_object_type = models.CharField(max_length=50, null=True, blank=True)
    related_object_id = models.BigIntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['user', '-sent_at']),
            models.Index(fields=['user', 'is_read']),
        ]
        verbose_name = 'Thông báo'
        verbose_name_plural = 'Thông báo'
    
    def __str__(self):
        return f"{self.user.full_name or self.user.phone_number} - {self.title}"
    
    @classmethod
    def create_notification(cls, user, title, message, notification_type='SYSTEM', 
                          related_type=None, related_id=None):
        """
        Helper method để tạo notification
        """
        return cls.objects.create(
            user=user,
            title=title,
            message=message,
            type=notification_type,
            related_object_type=related_type,
            related_object_id=related_id
        )