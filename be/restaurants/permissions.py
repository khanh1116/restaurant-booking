#restaurants/permissions
from rest_framework import permissions


class IsPartnerOwner(permissions.BasePermission):
    """
    Permission: Chỉ Partner sở hữu nhà hàng mới được thao tác
    """
    def has_object_permission(self, request, view, obj):
        # Admin có full quyền
        if request.user.is_authenticated and request.user.role == 'ADMIN':
            return True
        
        # Partner chỉ được thao tác với nhà hàng của mình
        if request.user.is_authenticated and request.user.role == 'PARTNER':
            # obj có thể là Restaurant hoặc nested object (Image, MenuItem, TimeSlot)
            if hasattr(obj, 'partner'):
                return obj.partner.user == request.user
            elif hasattr(obj, 'restaurant'):
                return obj.restaurant.partner.user == request.user
        
        return False


class IsActivePartner(permissions.BasePermission):
    """
    Permission: Chỉ Partner có status=ACTIVE mới được tạo/sửa
    """
    def has_permission(self, request, view):
        if request.user.is_authenticated and request.user.role == 'PARTNER':
            try:
                partner = request.user.partner
                return partner.status == 'ACTIVE'
            except:
                return False
        
        # Admin luôn được phép
        if request.user.is_authenticated and request.user.role == 'ADMIN':
            return True
        
        return False


class IsPartnerOrReadOnly(permissions.BasePermission):
    """
    Permission: Public có thể đọc, chỉ Partner/Admin mới được ghi
    """
    def has_permission(self, request, view):
        # SAFE_METHODS = GET, HEAD, OPTIONS
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Các method khác cần đăng nhập và là Partner/Admin
        return (
            request.user.is_authenticated and 
            request.user.role in ['PARTNER', 'ADMIN']
        )

    def has_object_permission(self, request, view, obj):
        # Đọc: public
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Ghi: chỉ owner hoặc admin
        if request.user.is_authenticated and request.user.role == 'ADMIN':
            return True
        
        if request.user.is_authenticated and request.user.role == 'PARTNER':
            if hasattr(obj, 'partner'):
                return obj.partner.user == request.user
            elif hasattr(obj, 'restaurant'):
                return obj.restaurant.partner.user == request.user
        
        return False