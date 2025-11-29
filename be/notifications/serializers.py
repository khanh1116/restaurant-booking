# notifications/serializers.py
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer hiển thị thông báo
    """
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'type',
            'type_display',
            'sent_at',
            'is_read',
            'time_ago',
            'related_object_type',
            'related_object_id'
        ]
        read_only_fields = ['id', 'sent_at']
    
    def get_time_ago(self, obj):
        """
        Tính thời gian đã trôi qua (VD: "5 phút trước", "2 giờ trước")
        """
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.sent_at
        
        if diff < timedelta(minutes=1):
            return "Vừa xong"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} phút trước"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} giờ trước"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days} ngày trước"
        else:
            return obj.sent_at.strftime("%d/%m/%Y %H:%M")


class NotificationCreateSerializer(serializers.Serializer):
    """
    Serializer để admin/system gửi notification thủ công (nếu cần)
    """
    user_id = serializers.IntegerField()
    title = serializers.CharField(max_length=150)
    message = serializers.CharField()
    type = serializers.ChoiceField(
        choices=Notification.TYPE_CHOICES,
        default='SYSTEM'
    )
    
    def create(self, validated_data):
        from accounts.models import User
        
        user = User.objects.get(id=validated_data['user_id'])
        return Notification.create_notification(
            user=user,
            title=validated_data['title'],
            message=validated_data['message'],
            notification_type=validated_data['type']
        )