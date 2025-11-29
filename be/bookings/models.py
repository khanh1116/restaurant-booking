# bookings/models.py
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from accounts.models import User
from restaurants.models import Restaurant, TimeSlot


class Booking(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
        ('NO_SHOW', 'No Show'),
    ]

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bookings',
        limit_choices_to={'role': 'CUSTOMER'}
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    time_slot = models.ForeignKey(
        TimeSlot,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    booking_date = models.DateField()
    number_of_guests = models.IntegerField()
    special_request = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'bookings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['restaurant', 'booking_date']),
            models.Index(fields=['status', 'booking_date']),
        ]

    def __str__(self):
        return f"Booking #{self.id} - {self.customer.full_name} at {self.restaurant.name}"

    def clean(self):
        """Validate booking data"""
        errors = {}

        # 1. Kiểm tra ngày không được ở quá khứ
        if self.booking_date < timezone.now().date():
            errors['booking_date'] = "Không thể đặt bàn cho ngày trong quá khứ"

        # 2. Kiểm tra số khách > 0
        if self.number_of_guests <= 0:
            errors['number_of_guests'] = "Số khách phải lớn hơn 0"

        # 3. Kiểm tra time_slot thuộc về restaurant
        if self.time_slot and self.restaurant:
            if self.time_slot.restaurant_id != self.restaurant_id:
                errors['time_slot'] = "Khung giờ không thuộc về nhà hàng này"

        # 4. Kiểm tra time_slot có đang active không
        if self.time_slot and not self.time_slot.is_active:
            errors['time_slot'] = "Khung giờ này hiện không khả dụng"

        # 5. Kiểm tra restaurant có đang APPROVED không
        if self.restaurant and self.restaurant.status != 'APPROVED':
            errors['restaurant'] = "Nhà hàng này hiện không nhận đặt bàn"

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Auto-fill confirmed_at when status changes to CONFIRMED
        if self.status == 'CONFIRMED' and not self.confirmed_at:
            self.confirmed_at = timezone.now()
        
        self.full_clean()
        super().save(*args, **kwargs)

    def can_cancel(self):
        """Kiểm tra có thể hủy booking không"""
        return self.status in ['PENDING', 'CONFIRMED']

    def can_confirm(self):
        """Kiểm tra có thể xác nhận không"""
        return self.status == 'PENDING'

    def can_reject(self):
        """Kiểm tra có thể từ chối không"""
        return self.status == 'PENDING'

    def can_complete(self):
        """Kiểm tra có thể đánh dấu hoàn thành không"""
        return self.status == 'CONFIRMED'

    def can_mark_no_show(self):
        """Kiểm tra có thể đánh dấu no-show không"""
        return self.status == 'CONFIRMED'

    @staticmethod
    def count_bookings_for_slot(restaurant_id, booking_date, time_slot_id):
        """
        Đếm số booking còn hiệu lực cho một slot cụ thể
        (không tính CANCELLED và REJECTED)
        """
        return Booking.objects.filter(
            restaurant_id=restaurant_id,
            booking_date=booking_date,
            time_slot_id=time_slot_id,
            status__in=['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW']
        ).count()

    @staticmethod
    def is_slot_available(restaurant_id, booking_date, time_slot_id):
        """
        Kiểm tra slot còn chỗ trống không
        """
        try:
            time_slot = TimeSlot.objects.get(id=time_slot_id)
            
            if not time_slot.is_active:
                return False, "Khung giờ này không hoạt động"

            current_bookings = Booking.count_bookings_for_slot(
                restaurant_id, booking_date, time_slot_id
            )

            if time_slot.max_bookings and current_bookings >= time_slot.max_bookings:
                return False, f"Khung giờ này đã đầy ({current_bookings}/{time_slot.max_bookings})"

            return True, f"Còn trống ({current_bookings}/{time_slot.max_bookings or 'unlimited'})"

        except TimeSlot.DoesNotExist:
            return False, "Khung giờ không tồn tại"