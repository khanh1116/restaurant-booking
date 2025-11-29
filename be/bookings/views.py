# bookings/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

from .models import Booking
from .serializers import (
    BookingListSerializer,
    BookingDetailSerializer,
    BookingCreateSerializer,
    CheckAvailabilitySerializer
)
from restaurants.models import Restaurant, TimeSlot
from .permissions import IsCustomer, IsPartnerOfRestaurant


class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet cho quản lý bookings
    - Customer: Tạo, xem, hủy booking của mình
    - Partner: Xem, confirm, reject, complete booking của nhà hàng mình
    """
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        elif self.action == 'retrieve':
            return BookingDetailSerializer
        return BookingListSerializer

    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'CUSTOMER':
            # Customer chỉ xem booking của mình
            return Booking.objects.filter(customer=user).select_related(
                'restaurant', 'time_slot', 'customer'
            )
        elif user.role == 'PARTNER':
            # Partner xem booking của tất cả nhà hàng mình quản lý
            return Booking.objects.filter(
                restaurant__partner__user=user
            ).select_related(
                'restaurant', 'time_slot', 'customer'
            )
        elif user.role == 'ADMIN':
            # Admin xem tất cả
            return Booking.objects.all().select_related(
                'restaurant', 'time_slot', 'customer'
            )
        
        return Booking.objects.none()

    def list(self, request, *args, **kwargs):
        """
        GET /api/bookings/
        List bookings với filter options
        """
        queryset = self.get_queryset()
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        
        # Filter by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(booking_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(booking_date__lte=end_date)
        
        # Filter by restaurant (for partner/admin)
        restaurant_id = request.query_params.get('restaurant_id')
        if restaurant_id and request.user.role in ['PARTNER', 'ADMIN']:
            queryset = queryset.filter(restaurant_id=restaurant_id)
        
        # Order by
        order_by = request.query_params.get('order_by', '-created_at')
        queryset = queryset.order_by(order_by)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'message': 'Lấy danh sách booking thành công',
            'data': serializer.data
        })

    def create(self, request, *args, **kwargs):
        """
        POST /api/bookings/
        Tạo booking mới (Customer only)
        """
        if request.user.role != 'CUSTOMER':
            return Response(
                {'error': 'Chỉ khách hàng mới có thể đặt bàn'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        
        # Tăng total_bookings cho customer
        if hasattr(request.user, 'customer_profile'):
            customer_profile = request.user.customer_profile
            customer_profile.total_bookings += 1
            customer_profile.save()
        
        # TODO: Send notification to partner
        
        return Response({
            'message': 'Đặt bàn thành công',
            'data': BookingDetailSerializer(booking).data
        }, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        """
        GET /api/bookings/{id}/
        Xem chi tiết booking
        """
        booking = self.get_object()
        serializer = self.get_serializer(booking)
        return Response({
            'message': 'Lấy thông tin booking thành công',
            'data': serializer.data
        })

    @action(detail=True, methods=['put'], permission_classes=[IsAuthenticated, IsCustomer])
    def cancel(self, request, pk=None):
        """
        PUT /api/bookings/{id}/cancel/
        Hủy booking (Customer only, chỉ khi status = PENDING/CONFIRMED)
        """
        booking = self.get_object()
        
        # Kiểm tra booking có thuộc về customer này không
        if booking.customer != request.user:
            return Response(
                {'error': 'Bạn không có quyền hủy booking này'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not booking.can_cancel():
            return Response(
                {'error': f'Không thể hủy booking ở trạng thái {booking.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        booking.status = 'CANCELLED'
        booking.save()
        
        # TODO: Send notification to partner
        
        return Response({
            'message': 'Hủy booking thành công',
            'data': BookingDetailSerializer(booking).data
        })

    @action(detail=True, methods=['put'], permission_classes=[IsAuthenticated])
    def confirm(self, request, pk=None):
        """
        PUT /api/bookings/{id}/confirm/
        Xác nhận booking (Partner only, chỉ khi status = PENDING)
        """
        booking = self.get_object()
        
        # Kiểm tra quyền: chỉ partner của restaurant này
        if request.user.role != 'PARTNER' or booking.restaurant.partner != request.user.partner:
            return Response(
                {'error': 'Bạn không có quyền xác nhận booking này'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not booking.can_confirm():
            return Response(
                {'error': f'Không thể xác nhận booking ở trạng thái {booking.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        booking.status = 'CONFIRMED'
        booking.confirmed_at = timezone.now()
        booking.save()
        
        # TODO: Send notification to customer
        
        return Response({
            'message': 'Xác nhận booking thành công',
            'data': BookingDetailSerializer(booking).data
        })

    @action(detail=True, methods=['put'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """
        PUT /api/bookings/{id}/reject/
        Từ chối booking (Partner only, chỉ khi status = PENDING)
        """
        booking = self.get_object()
        
        # Kiểm tra quyền
        if request.user.role != 'PARTNER' or booking.restaurant.partner != request.user.partner:
            return Response(
                {'error': 'Bạn không có quyền từ chối booking này'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not booking.can_reject():
            return Response(
                {'error': f'Không thể từ chối booking ở trạng thái {booking.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        booking.status = 'REJECTED'
        booking.save()
        
        # TODO: Send notification to customer
        
        return Response({
            'message': 'Từ chối booking thành công',
            'data': BookingDetailSerializer(booking).data
        })

    @action(detail=True, methods=['put'], permission_classes=[IsAuthenticated])
    def complete(self, request, pk=None):
        """
        PUT /api/bookings/{id}/complete/
        Đánh dấu hoàn thành (Partner only, chỉ khi status = CONFIRMED)
        """
        booking = self.get_object()
        
        if request.user.role != 'PARTNER' or booking.restaurant.partner != request.user.partner:
            return Response(
                {'error': 'Bạn không có quyền cập nhật booking này'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not booking.can_complete():
            return Response(
                {'error': f'Không thể hoàn thành booking ở trạng thái {booking.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        booking.status = 'COMPLETED'
        booking.save()
        
        # TODO: Có thể cộng loyalty points cho customer
        
        return Response({
            'message': 'Đánh dấu hoàn thành thành công',
            'data': BookingDetailSerializer(booking).data
        })

    @action(detail=True, methods=['put'], permission_classes=[IsAuthenticated])
    def no_show(self, request, pk=None):
        """
        PUT /api/bookings/{id}/no-show/
        Đánh dấu khách không đến (Partner only, chỉ khi status = CONFIRMED)
        """
        booking = self.get_object()
        
        if request.user.role != 'PARTNER' or booking.restaurant.partner != request.user.partner:
            return Response(
                {'error': 'Bạn không có quyền cập nhật booking này'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not booking.can_mark_no_show():
            return Response(
                {'error': f'Không thể đánh dấu no-show ở trạng thái {booking.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        booking.status = 'NO_SHOW'
        booking.save()
        
        return Response({
            'message': 'Đánh dấu no-show thành công',
            'data': BookingDetailSerializer(booking).data
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def check_availability(self, request):
        """
        POST /api/bookings/check-availability/
        Kiểm tra khung giờ còn chỗ trống
        Body: {
            "restaurant_id": 1,
            "booking_date": "2025-01-20",
            "time_slot_id": 3  // optional - nếu có thì check slot cụ thể
        }
        """
        serializer = CheckAvailabilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        restaurant_id = serializer.validated_data['restaurant_id']
        booking_date = serializer.validated_data['booking_date']
        time_slot_id = serializer.validated_data.get('time_slot_id')
        
        if time_slot_id:
            # Check slot cụ thể
            available, message = Booking.is_slot_available(
                restaurant_id, booking_date, time_slot_id
            )
            
            time_slot = TimeSlot.objects.get(id=time_slot_id)
            current_bookings = Booking.count_bookings_for_slot(
                restaurant_id, booking_date, time_slot_id
            )
            
            return Response({
                'available': available,
                'message': message,
                'time_slot': {
                    'id': time_slot.id,
                    'start_time': time_slot.start_time.strftime('%H:%M'),
                    'end_time': time_slot.end_time.strftime('%H:%M'),
                    'max_bookings': time_slot.max_bookings,
                    'current_bookings': current_bookings,
                }
            })
        else:
            # Trả về tất cả slots available
            restaurant = Restaurant.objects.get(id=restaurant_id)
            time_slots = TimeSlot.objects.filter(
                restaurant=restaurant,
                is_active=True
            ).order_by('start_time')
            
            available_slots = []
            for slot in time_slots:
                current_bookings = Booking.count_bookings_for_slot(
                    restaurant_id, booking_date, slot.id
                )
                is_available = not slot.max_bookings or current_bookings < slot.max_bookings
                
                available_slots.append({
                    'id': slot.id,
                    'start_time': slot.start_time.strftime('%H:%M'),
                    'end_time': slot.end_time.strftime('%H:%M'),
                    'max_bookings': slot.max_bookings,
                    'current_bookings': current_bookings,
                    'available': is_available
                })
            
            return Response({
                'date': booking_date,
                'restaurant_id': restaurant_id,
                'restaurant_name': restaurant.name,
                'available_slots': available_slots
            })