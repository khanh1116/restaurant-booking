# ==================== accounts/serializers.py ====================
from rest_framework import serializers
from .models import User, Customer, Partner


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'phone_number', 'email', 'full_name', 'role', 'created_at']
        read_only_fields = ['id', 'created_at', 'role']


class CustomerSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)
    full_name = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Customer
        fields = ['phone_number', 'password', 'full_name', 'email']

    def create(self, validated_data):
        phone_number = validated_data.pop('phone_number')
        password = validated_data.pop('password')
        full_name = validated_data.pop('full_name')
        email = validated_data.pop('email', None)
        
        user = User.objects.create_user(
            phone_number=phone_number,
            password=password,
            full_name=full_name,
            email=email,
            role='CUSTOMER'
        )
        customer = Customer.objects.create(user=user)
        return customer


class PartnerSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)
    full_name = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    business_name = serializers.CharField(write_only=True)
    business_license = serializers.CharField(write_only=True, required=False, allow_blank=True)
    tax_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Partner
        fields = ['phone_number', 'password', 'full_name', 'email', 'business_name', 'business_license', 'tax_code']

    def create(self, validated_data):
        phone_number = validated_data.pop('phone_number')
        password = validated_data.pop('password')
        full_name = validated_data.pop('full_name')
        email = validated_data.pop('email', None)
        business_name = validated_data.pop('business_name')
        business_license = validated_data.pop('business_license', None)
        tax_code = validated_data.pop('tax_code', None)
        
        user = User.objects.create_user(
            phone_number=phone_number,
            password=password,
            full_name=full_name,
            email=email,
            role='PARTNER'
        )
        partner = Partner.objects.create(
            user=user,
            business_name=business_name,
            business_license=business_license,
            tax_code=tax_code
        )
        return partner


class LoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    password = serializers.CharField(write_only=True)


class CustomerDetailSerializer(serializers.ModelSerializer):
    """Serializer chi tiết cho Customer (kèm thông tin user)"""
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = Customer
        fields = ['phone_number', 'email', 'full_name', 'date_of_birth', 'address', 'loyalty_points', 'total_bookings']


class PartnerDetailSerializer(serializers.ModelSerializer):
    """Serializer chi tiết cho Partner (kèm thông tin user)"""
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = Partner
        fields = ['phone_number', 'email', 'full_name', 'business_name', 'business_license', 'tax_code', 'status']

