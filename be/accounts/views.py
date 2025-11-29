# ==================== accounts/views.py ====================
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Customer, Partner
from .serializers import (
    CustomerSerializer, PartnerSerializer, LoginSerializer, 
    UserSerializer, CustomerDetailSerializer, PartnerDetailSerializer
)


class CustomerRegisterView(generics.CreateAPIView):
    """Đăng ký tài khoản khách hàng"""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        
        # Tạo token
        refresh = RefreshToken.for_user(customer.user)
        
        return Response({
            'message': 'Đăng ký khách hàng thành công',
            'user': UserSerializer(customer.user).data,
            'customer': CustomerDetailSerializer(customer).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class PartnerRegisterView(generics.CreateAPIView):
    """Đăng ký tài khoản đối tác"""
    queryset = Partner.objects.all()
    serializer_class = PartnerSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        partner = serializer.save()
        
        refresh = RefreshToken.for_user(partner.user)
        
        return Response({
            'message': 'Đăng ký đối tác thành công.',
            'user': UserSerializer(partner.user).data,
            'partner': PartnerDetailSerializer(partner).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Đăng nhập cho tất cả user types"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        phone_number = serializer.validated_data['phone_number']
        password = serializer.validated_data['password']
        
        user = authenticate(phone_number=phone_number, password=password)
        
        if user is None:
            return Response({
                'error': 'Số điện thoại hoặc mật khẩu không đúng'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response({
                'error': 'Tài khoản đã bị vô hiệu hóa'
            }, status=status.HTTP_403_FORBIDDEN)
        
        refresh = RefreshToken.for_user(user)
        
        response_data = {
            'message': 'Đăng nhập thành công',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }
        
        # Thêm thông tin chi tiết theo role
        if user.role == 'CUSTOMER' and hasattr(user, 'customer'):
            response_data['customer'] = CustomerDetailSerializer(user.customer).data
        elif user.role == 'PARTNER' and hasattr(user, 'partner'):
            response_data['partner'] = PartnerDetailSerializer(user.partner).data
        
        return Response(response_data)


class ProfileView(APIView):
    """Xem thông tin profile của user hiện tại"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'user': UserSerializer(user).data
        }
        
        if user.role == 'CUSTOMER' and hasattr(user, 'customer'):
            data['customer'] = CustomerDetailSerializer(user.customer).data
        elif user.role == 'PARTNER' and hasattr(user, 'partner'):
            data['partner'] = PartnerDetailSerializer(user.partner).data
        
        return Response(data)

    def put(self, request):
        """Cập nhật thông tin profile"""
        user = request.user
        
        # Cập nhật thông tin User
        user_data = {}
        if 'full_name' in request.data:
            user_data['full_name'] = request.data['full_name']
        if 'email' in request.data:
            user_data['email'] = request.data['email']
        
        if user_data:
            user_serializer = UserSerializer(user, data=user_data, partial=True)
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()
        
        # Cập nhật thông tin Customer/Partner
        if user.role == 'CUSTOMER' and hasattr(user, 'customer'):
            customer_data = {k: v for k, v in request.data.items() if k in ['date_of_birth', 'address']}
            if customer_data:
                customer_serializer = CustomerDetailSerializer(user.customer, data=customer_data, partial=True)
                customer_serializer.is_valid(raise_exception=True)
                customer_serializer.save()
        
        elif user.role == 'PARTNER' and hasattr(user, 'partner'):
            partner_data = {k: v for k, v in request.data.items() if k in ['business_name', 'business_license', 'tax_code']}
            if partner_data:
                partner_serializer = PartnerDetailSerializer(user.partner, data=partner_data, partial=True)
                partner_serializer.is_valid(raise_exception=True)
                partner_serializer.save()
        
        return Response({
            'message': 'Cập nhật thông tin thành công',
            'user': UserSerializer(user).data
        })


class LogoutView(APIView):
    """Đăng xuất (blacklist refresh token)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Đăng xuất thành công'})
        except Exception:
            return Response({'error': 'Token không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)

