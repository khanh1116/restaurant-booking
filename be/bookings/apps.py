# bookings/apps.py
from django.apps import AppConfig


class BookingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'bookings'
    verbose_name = 'Quản lý đặt bàn'

    def ready(self):
        # Import signals nếu có
        # import bookings.signals
        pass