# ==================== accounts/models.py ====================
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, phone_number, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('Số điện thoại là bắt buộc')
        user = self.model(phone_number=phone_number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault('role', 'ADMIN')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(phone_number, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('CUSTOMER', 'Customer'),
        ('PARTNER', 'Partner'),
        ('ADMIN', 'Admin'),
    ]

    id = models.BigAutoField(primary_key=True)
    phone_number = models.CharField(max_length=20, unique=True)
    email = models.EmailField(max_length=100, null=True, blank=True)
    full_name = models.CharField(max_length=100, null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CUSTOMER')
    created_at = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.full_name or self.phone_number} ({self.role})"


class Customer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name='customer')
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    loyalty_points = models.IntegerField(default=0)
    total_bookings = models.IntegerField(default=0)

    class Meta:
        db_table = 'customers'

    def __str__(self):
        return f"Customer: {self.user.full_name} ({self.user.phone_number})"


class Partner(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name='partner')
    business_name = models.CharField(max_length=150)
    business_license = models.CharField(max_length=100, null=True, blank=True)
    tax_code = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    class Meta:
        db_table = 'partners'

    def __str__(self):
        return f"Partner: {self.business_name} ({self.user.phone_number})"

