#restaurants/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LocationViewSet,
    RestaurantViewSet,
    RestaurantImageViewSet,
    MenuItemViewSet,
    TimeSlotViewSet
)

router = DefaultRouter()
router.register('locations', LocationViewSet, basename='location')
router.register('restaurants', RestaurantViewSet, basename='restaurant')
router.register('images', RestaurantImageViewSet, basename='restaurant-image')
router.register('menu-items', MenuItemViewSet, basename='menu-item')
router.register('time-slots', TimeSlotViewSet, basename='time-slot')

urlpatterns = [
    path('', include(router.urls)),
]