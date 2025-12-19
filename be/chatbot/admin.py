# chatbot/admin.py
"""
Chatbot Admin
"""
from django.contrib import admin
from chatbot.models import ChatLog


@admin.register(ChatLog)
class ChatLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'question_preview', 'intent', 'type', 'confidence', 'created_at']
    list_filter = ['type', 'intent', 'created_at']
    search_fields = ['question', 'answer']
    readonly_fields = ['created_at']
    
    def question_preview(self, obj):
        return obj.question[:50] + '...' if len(obj.question) > 50 else obj.question
    
    question_preview.short_description = 'Question'