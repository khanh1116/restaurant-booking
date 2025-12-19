"""
Chatbot App Config
"""
from django.apps import AppConfig


class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chatbot'
    verbose_name = 'Chatbot'
    
    def ready(self):
        """
        Load model khi app khởi động (optional - warm up)
        """
        # Uncomment để load model ngay khi start server
        from chatbot.services.intent_detector import get_intent_detector
        get_intent_detector()
        pass