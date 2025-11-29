# notifications/apps.py
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'
    verbose_name = 'Thông báo'
    
    def ready(self):
        """
        Import signals khi app ready
        """
        import notifications.signals