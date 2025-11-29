# bookings/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookingViewSet

router = DefaultRouter()
router.register(r'', BookingViewSet, basename='booking')

urlpatterns = [
    path('', include(router.urls)),
]

# Các routes được tự động tạo:
# GET    /api/bookings/                     - List bookings
# POST   /api/bookings/                     - Create booking (customer)
# GET    /api/bookings/{id}/                - Get booking detail
# PUT    /api/bookings/{id}/cancel/         - Cancel booking (customer)
# PUT    /api/bookings/{id}/confirm/        - Confirm booking (partner)
# PUT    /api/bookings/{id}/reject/         - Reject booking (partner)
# PUT    /api/bookings/{id}/complete/       - Complete booking (partner)
# PUT    /api/bookings/{id}/no-show/        - Mark no-show (partner)
# POST   /api/bookings/check-availability/  - Check slot availability