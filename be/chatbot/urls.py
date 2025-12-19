# chatbot/urls.py

"""
Chatbot URLs
"""
from django.urls import path
from chatbot import views

app_name = 'chatbot'

urlpatterns = [
    # Main endpoint
    path('ask/', views.chatbot_ask, name='chatbot_ask'),
    
    # Health check
    path('health/', views.chatbot_health, name='chatbot_health'),
    
    # Test endpoint
    path('test/', views.chatbot_test, name='chatbot_test'),

    # 🆕 ViT5 test endpoint
    path('vit5-test/', views.chatbot_vit5_test, name='vit5_test'),
]