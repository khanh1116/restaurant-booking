# bookings/permissions.py
from rest_framework import permissions


class IsCustomer(permissions.BasePermission):
    """
    Permission: Chỉ cho phép user có role=CUSTOMER
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'CUSTOMER'


class IsPartner(permissions.BasePermission):
    """
    Permission: Chỉ cho phép user có role=PARTNER
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'PARTNER'


class IsPartnerOfRestaurant(permissions.BasePermission):
    """
    Permission: Partner chỉ thao tác với booking của nhà hàng mình
    """
    def has_object_permission(self, request, view, obj):
        # obj là Booking
        if request.user.role != 'PARTNER':
            return False
        return obj.restaurant.partner == request.user


class IsOwnerOrPartner(permissions.BasePermission):
    """
    Permission: Customer chỉ thao tác booking của mình,
    Partner chỉ thao tác booking của nhà hàng mình
    """
    def has_object_permission(self, request, view, obj):
        # obj là Booking
        if request.user.role == 'CUSTOMER':
            return obj.customer == request.user
        elif request.user.role == 'PARTNER':
            return obj.restaurant.partner == request.user
        elif request.user.role == 'ADMIN':
            return True
        return False