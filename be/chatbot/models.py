# chatbot/models.py

"""
Chatbot Models - Log chat history (Optional)
"""
from django.db import models
from accounts.models import User


class ChatLog(models.Model):
    """
    Log chat history (optional - để phân tích sau)
    """
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_logs'
    )
    session_id = models.CharField(max_length=100, null=True, blank=True)
    question = models.TextField()
    answer = models.TextField()
    intent = models.CharField(max_length=100, null=True, blank=True)
    confidence = models.FloatField(default=0.0)
    type = models.CharField(max_length=50)  # FAQ, DB_QUERY, UNKNOWN
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['session_id']),
        ]
    
    def __str__(self):
        return f"Chat #{self.id} - {self.question[:50]}"


# Nếu muốn log, thêm vào views.py:
# from chatbot.models import ChatLog
# ChatLog.objects.create(
#     user=request.user if request.user.is_authenticated else None,
#     question=question,
#     answer=result['answer'],
#     intent=intent_result.get('intent'),
#     confidence=intent_result.get('confidence', 0.0),
#     type=result.get('type')
# )