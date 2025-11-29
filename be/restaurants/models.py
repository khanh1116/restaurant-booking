#restaurants/models.py
import os
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models.signals import pre_delete, pre_save
from django.dispatch import receiver
from accounts.models import Partner


class Location(models.Model):
    """Địa điểm (Thành phố, Quận, Phường)"""
    city = models.CharField(max_length=100)
    district = models.CharField(max_length=100, null=True, blank=True)
    ward = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'locations'
        verbose_name = 'Location'
        verbose_name_plural = 'Locations'

    def __str__(self):
        return f"{self.city} - {self.district or 'N/A'} - {self.ward or 'N/A'}"

    def get_full_address(self):
        """Trả về địa chỉ đầy đủ"""
        parts = [self.ward, self.district, self.city]
        return ', '.join([p for p in parts if p])


def restaurant_image_upload_path(instance, filename):
    """
    Tạo path cho ảnh nhà hàng: restaurant_images/restaurant_{id}_{timestamp}.ext
    """
    import time
    ext = filename.split('.')[-1]
    timestamp = int(time.time())
    new_filename = f"restaurant_{instance.restaurant.id}_{timestamp}.{ext}"
    return os.path.join('restaurant_images', new_filename)


def menu_item_image_upload_path(instance, filename):
    """
    Tạo path cho ảnh món ăn: menu_items/menuitem_{id}_{timestamp}.ext
    """
    import time
    ext = filename.split('.')[-1]
    timestamp = int(time.time())
    new_filename = f"menuitem_{instance.id or 'new'}_{timestamp}.{ext}"
    return os.path.join('menu_items', new_filename)


class Restaurant(models.Model):
    """Nhà hàng"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('SUSPENDED', 'Suspended'),
        ('CLOSED', 'Closed'),
    ]

    partner = models.ForeignKey(
        Partner,
        on_delete=models.CASCADE,
        related_name='restaurants'
    )
    name = models.CharField(max_length=150)
    address = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    opening_hours = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="VD: 10:00-22:00"
    )
    slot_duration = models.IntegerField(
        default=120,
        validators=[MinValueValidator(30)],
        help_text="Thời gian 1 slot (phút)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        related_name='restaurants'
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'restaurants'
        verbose_name = 'Restaurant'
        verbose_name_plural = 'Restaurants'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['partner']),
            models.Index(fields=['location']),
            models.Index(fields=['status']),
            models.Index(fields=['rating']),
        ]

    def __str__(self):
        return self.name

    def get_available_slots(self, date):
        """Lấy danh sách time slots còn trống cho ngày cụ thể"""
        from django.db.models import Count, Q
        
        slots = self.time_slots.filter(is_active=True).annotate(
            booking_count=Count(
                'bookings',
                filter=Q(
                    bookings__booking_date=date,
                    bookings__status__in=['PENDING', 'CONFIRMED']
                )
            )
        )
        
        available = [
            slot for slot in slots 
            if slot.booking_count < slot.max_bookings
        ]
        return available

    def calculate_rating(self):
        """Tính rating trung bình (có thể mở rộng sau)"""
        return self.rating


class RestaurantImage(models.Model):
    """Ảnh nhà hàng"""
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(
        upload_to=restaurant_image_upload_path,
        null=True,    
        blank=True, 
        help_text="Upload ảnh nhà hàng (JPG, PNG)"
    )
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        db_table = 'restaurant_images'
        verbose_name = 'Restaurant Image'
        verbose_name_plural = 'Restaurant Images'
        ordering = ['display_order', '-created_at']

    def __str__(self):
        return f"Image of {self.restaurant.name}"
    
    @property
    def image_url(self):
        """Trả về path tương đối (không có domain)"""
        if self.image:
            return self.image.name  # Trả về: restaurant_images/abc.jpg
        return ''


@receiver(pre_delete, sender=RestaurantImage)
def delete_restaurant_image_file(sender, instance, **kwargs):
    """Xóa file ảnh khi xóa record"""
    if instance.image:
        if os.path.isfile(instance.image.path):
            os.remove(instance.image.path)


@receiver(pre_save, sender=RestaurantImage)
def delete_old_restaurant_image_on_update(sender, instance, **kwargs):
    """Xóa ảnh cũ khi update ảnh mới"""
    if not instance.pk:
        return
    
    try:
        old_image = RestaurantImage.objects.get(pk=instance.pk).image
    except RestaurantImage.DoesNotExist:
        return
    
    new_image = instance.image
    if old_image and old_image != new_image:
        if os.path.isfile(old_image.path):
            os.remove(old_image.path)


class MenuItem(models.Model):
    """Món ăn"""
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name='menu_items'
    )
    name = models.CharField(max_length=150)
    description = models.TextField(null=True, blank=True)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    image = models.ImageField(
        upload_to=menu_item_image_upload_path,
        null=True,
        blank=True,
        help_text="Upload ảnh món ăn (JPG, PNG)"
    )
    category = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="VD: Món chính, Đồ uống"
    )
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'menu_items'
        verbose_name = 'Menu Item'
        verbose_name_plural = 'Menu Items'
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} - {self.restaurant.name}"
    
    @property
    def image_url(self):
        """Trả về path tương đối (không có domain)"""
        if self.image:
            return self.image.name  # Trả về: menu_items/abc.jpg
        return ''


@receiver(pre_delete, sender=MenuItem)
def delete_menu_item_image_file(sender, instance, **kwargs):
    """Xóa file ảnh khi xóa món ăn"""
    if instance.image:
        if os.path.isfile(instance.image.path):
            os.remove(instance.image.path)


@receiver(pre_save, sender=MenuItem)
def delete_old_menu_item_image_on_update(sender, instance, **kwargs):
    """Xóa ảnh cũ khi update ảnh mới"""
    if not instance.pk:
        return
    
    try:
        old_image = MenuItem.objects.get(pk=instance.pk).image
    except MenuItem.DoesNotExist:
        return
    
    new_image = instance.image
    if old_image and old_image != new_image:
        if os.path.isfile(old_image.path):
            os.remove(old_image.path)


class TimeSlot(models.Model):
    """Khung giờ đặt bàn"""
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name='time_slots'
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    max_bookings = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1)]
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'time_slots'
        verbose_name = 'Time Slot'
        verbose_name_plural = 'Time Slots'
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['restaurant']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(start_time__lt=models.F('end_time')),
                name='time_slots_start_before_end'
            )
        ]

    def __str__(self):
        return f"{self.restaurant.name}: {self.start_time} - {self.end_time}"

    def get_current_booking_count(self, date):
        """Đếm số booking hiện tại cho slot này vào ngày cụ thể"""
        return self.bookings.filter(
            booking_date=date,
            status__in=['PENDING', 'CONFIRMED']
        ).count()

    def is_available(self, date):
        """Kiểm tra slot còn chỗ trống không"""
        return self.get_current_booking_count(date) < self.max_bookings