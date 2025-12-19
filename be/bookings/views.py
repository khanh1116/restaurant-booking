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

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[IsAuthenticated],
        url_path='partner-dashboard-stats'
    )
    def partner_dashboard_stats(self, request):
        """
        GET /api/bookings/partner-dashboard-stats/?restaurant_id=...
        
        Trả về thống kê cho partner dashboard:
        - total_restaurants: Tổng số nhà hàng của partner
        - bookings_today: Booking hôm nay
        - bookings_this_week: Booking tuần này
        - bookings_pending: Booking chờ xác nhận
        - upcoming_bookings_next_2h: Booking sắp diễn ra (2h tới)
        - upcoming_bookings_next_24h: Booking sắp diễn ra (24h tới)
        - peak_hours_today: Top 3 khung giờ có booking hôm nay
        - bookings_7days: Booking 7 ngày gần nhất (cho biểu đồ)
        """
        from datetime import datetime, timedelta
        from collections import Counter
        
        user = request.user
        
        # Chỉ partner mới xem được
        if user.role != 'PARTNER':
            return Response(
                {'error': 'Only partners can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Lấy tất cả nhà hàng của partner
        restaurants = Restaurant.objects.filter(partner__user=user)
        total_restaurants = restaurants.count()
        restaurant_ids = list(restaurants.values_list('id', flat=True))
        
        # Nếu có restaurant_id param, chỉ lọc nhà hàng đó
        restaurant_id_param = request.query_params.get('restaurant_id')
        if restaurant_id_param:
            if int(restaurant_id_param) not in restaurant_ids:
                return Response(
                    {'error': 'Restaurant not found or not owned by you'},
                    status=status.HTTP_404_NOT_FOUND
                )
            restaurant_ids = [int(restaurant_id_param)]
        
        # Base queryset
        bookings_qs = Booking.objects.filter(restaurant_id__in=restaurant_ids)
        
        # 1. Bookings today
        today = timezone.now().date()
        bookings_today = bookings_qs.filter(booking_date=today).count()
        
        # 2. Bookings this week (Mon-Sun)
        now = timezone.now()
        day = now.weekday()
        week_start = now - timedelta(days=day)
        week_end = week_start + timedelta(days=6)
        week_start_date = week_start.date()
        week_end_date = week_end.date()
        bookings_this_week = bookings_qs.filter(
            booking_date__gte=week_start_date,
            booking_date__lte=week_end_date
        ).count()
        
        # 3. Bookings pending
        bookings_pending = bookings_qs.filter(status='PENDING').count()
        
        # 4. Upcoming bookings next 2h
        now = timezone.now()
        two_hours_later = now + timedelta(hours=2)
        upcoming_2h = bookings_qs.filter(
            booking_date=today,
            time_slot__start_time__lte=two_hours_later.time(),
            time_slot__start_time__gte=now.time(),
            status__in=['PENDING', 'CONFIRMED']
        ).count()
        
        # 5. Upcoming bookings next 24h
        tomorrow = today + timedelta(days=1)
        upcoming_24h = bookings_qs.filter(
            booking_date__in=[today, tomorrow],
            status__in=['PENDING', 'CONFIRMED']
        ).count()
        
        # 6. Peak hours today (top 3)
        today_bookings = bookings_qs.filter(booking_date=today)
        time_slot_counts = Counter(
            slot.time_slot.start_time for slot in today_bookings if slot.time_slot
        )
        peak_hours = [
            {
                'time': str(time.strftime('%H:%M')),
                'count': count
            }
            for time, count in time_slot_counts.most_common(3)
        ]
        
        # 7. Bookings 7 days (for chart)
        bookings_7days_data = []
        for i in range(6, -1, -1):  # 6 days ago to today
            day_date = today - timedelta(days=i)
            count = bookings_qs.filter(booking_date=day_date).count()
            bookings_7days_data.append({
                'date': day_date.strftime('%Y-%m-%d'),
                'day': day_date.strftime('%a'),
                'count': count
            })
        
        return Response({
            'total_restaurants': total_restaurants,
            'bookings_today': bookings_today,
            'bookings_this_week': bookings_this_week,
            'bookings_pending': bookings_pending,
            'upcoming_bookings_next_2h': upcoming_2h,
            'upcoming_bookings_next_24h': upcoming_24h,
            'peak_hours_today': peak_hours,
            'bookings_7days': bookings_7days_data
        })