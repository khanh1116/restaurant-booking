# notifications/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet quản lý notifications
    
    Endpoints:
    - GET /api/notifications/ - Danh sách notification của user
    - GET /api/notifications/{id}/ - Chi tiết notification
    - DELETE /api/notifications/{id}/ - Xóa notification
    - PUT /api/notifications/{id}/mark-read/ - Đánh dấu đã đọc
    - POST /api/notifications/mark-all-read/ - Đánh dấu tất cả đã đọc
    - DELETE /api/notifications/delete-all-read/ - Xóa tất cả đã đọc
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        User chỉ xem được notification của mình
        """
        return Notification.objects.filter(user=self.request.user)
    
    def list(self, request):
        """
        GET /api/notifications/
        Lấy danh sách notifications, có thể filter theo is_read
        Query params:
        - is_read: true/false (optional)
        - type: BOOKING/RESTAURANT/SYSTEM (optional)
        """
        queryset = self.get_queryset()
        
        # Filter by is_read
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read_bool)
        
        # Filter by type
        notification_type = request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(type=notification_type)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Count unread
        unread_count = queryset.filter(is_read=False).count()
        
        return Response({
            'data': serializer.data,
            'unread_count': unread_count
        })
    
    def retrieve(self, request, pk=None):
        """
        GET /api/notifications/{id}/
        Xem chi tiết notification (tự động mark as read)
        """
        try:
            notification = self.get_queryset().get(pk=pk)
            
            # Auto mark as read khi user xem
            if not notification.is_read:
                notification.is_read = True
                notification.save()
            
            serializer = self.get_serializer(notification)
            return Response({
                'data': serializer.data
            })
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Không tìm thấy thông báo'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, pk=None):
        """
        DELETE /api/notifications/{id}/
        Xóa notification
        """
        try:
            notification = self.get_queryset().get(pk=pk)
            notification.delete()
            return Response({
                'message': 'Đã xóa thông báo'
            }, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Không tìm thấy thông báo'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['put'])
    def mark_read(self, request, pk=None):
        """
        PUT /api/notifications/{id}/mark-read/
        Đánh dấu notification đã đọc
        """
        try:
            notification = self.get_queryset().get(pk=pk)
            notification.is_read = True
            notification.save()
            
            serializer = self.get_serializer(notification)
            return Response({
                'message': 'Đã đánh dấu đã đọc',
                'data': serializer.data
            })
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Không tìm thấy thông báo'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """
        POST /api/notifications/mark-all-read/
        Đánh dấu tất cả notification đã đọc
        """
        updated_count = self.get_queryset().filter(
            is_read=False
        ).update(is_read=True)
        
        return Response({
            'message': f'Đã đánh dấu {updated_count} thông báo là đã đọc'
        })
    
    @action(detail=False, methods=['delete'])
    def delete_all_read(self, request):
        """
        DELETE /api/notifications/delete-all-read/
        Xóa tất cả notification đã đọc
        """
        deleted_count, _ = self.get_queryset().filter(
            is_read=True
        ).delete()
        
        return Response({
            'message': f'Đã xóa {deleted_count} thông báo đã đọc'
        })
    
    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """
        GET /api/notifications/unread-count/
        Đếm số notification chưa đọc
        """
        count = self.get_queryset().filter(is_read=False).count()
        return Response({
            'unread_count': count
        })