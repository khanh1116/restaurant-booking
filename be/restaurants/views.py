# restaurants/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend

from .models import Location, Restaurant, RestaurantImage, MenuItem, TimeSlot
from .serializers import (
    LocationSerializer,
    RestaurantListSerializer,
    RestaurantDetailSerializer,
    RestaurantCreateUpdateSerializer,
    RestaurantImageSerializer,
    MenuItemSerializer,
    MenuItemCreateUpdateSerializer,
    TimeSlotSerializer,
    TimeSlotAvailabilitySerializer
)
from .permissions import IsPartnerOwner, IsActivePartner, IsPartnerOrReadOnly


class LocationViewSet(viewsets.ModelViewSet):
    """
    API endpoint cho Location
    - GET: Public
    - POST/PUT/DELETE: Admin hoặc Partner
    """
    queryset = Location.objects.all()
    serializer_class = LocationSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        # Admin hoặc Partner mới tạo được location
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if getattr(request.user, 'role', None) not in ['ADMIN', 'PARTNER']:
            return Response(
                {'error': 'Only admin or partner can create locations'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().create(request, *args, **kwargs)


class RestaurantViewSet(viewsets.ModelViewSet):
    """
    API endpoint cho Restaurant
    - Public/Customer: chỉ xem APPROVED
    - Partner:
        + /restaurants/: thấy nhà hàng của mình (mọi trạng thái) + APPROVED của người khác
        + /restaurants/my-restaurants/: chỉ nhà hàng của mình (mọi trạng thái) -> dùng cho trang quản lý
    - Admin: xem tất cả
    """
    queryset = Restaurant.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['location', 'status']
    search_fields = ['name', 'description', 'address']
    ordering_fields = ['rating', 'created_at']
    ordering = ['-rating']

    def get_permissions(self):
        """Phân quyền cho từng action"""
        # Public cho xem danh sách / detail / available-slots / search
        if self.action in ['list', 'retrieve', 'available_slots', 'search']:
            return [AllowAny()]
        
        # Tạo nhà hàng: Partner ACTIVE
        elif self.action == 'create':
            return [IsAuthenticated(), IsActivePartner()]
        
        # My restaurants (dashboard): cần đăng nhập (Partner/Admin)
        elif self.action == 'my_restaurants':
            return [IsAuthenticated()]
        
        # Các action khác: update/delete...
        else:
            return [IsAuthenticated(), IsPartnerOwner()]

    def get_serializer_class(self):
        """Chọn serializer phù hợp với action"""
        if self.action == 'list':
            return RestaurantListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return RestaurantCreateUpdateSerializer
        return RestaurantDetailSerializer

    def get_queryset(self):
        """
        GET /api/restaurants/restaurants/ (endpoint gốc)
        - Public: chỉ thấy APPROVED
        - Customer: chỉ thấy APPROVED
        - Partner: thấy nhà hàng của mình (mọi trạng thái) + APPROVED của người khác
        - Admin: thấy tất cả
        """
        queryset = super().get_queryset()
        user = self.request.user

        # Chưa đăng nhập -> chỉ APPROVED
        if not user.is_authenticated:
            return queryset.filter(status='APPROVED')

        role = getattr(user, "role", None)

        # Admin thấy tất cả
        if role == 'ADMIN':
            return queryset

        # Partner: nhà hàng của mình + APPROVED của người khác
        if role == 'PARTNER':
            return queryset.filter(
                Q(partner__user=user) | Q(status='APPROVED')
            )

        # Customer: chỉ APPROVED
        return queryset.filter(status='APPROVED')

    def perform_create(self, serializer):
        """Tự động gán partner hiện tại khi tạo nhà hàng"""
        partner = self.request.user.partner
        serializer.save(partner=partner, status='PENDING')

    def create(self, request, *args, **kwargs):
        """
        POST /api/restaurants/restaurants/
        Tạo nhà hàng mới (status = PENDING)
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return detail serializer
        instance = serializer.instance
        detail_serializer = RestaurantDetailSerializer(instance)

        return Response(
            {
                'message': 'Restaurant created successfully. Waiting for admin approval.',
                'data': detail_serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    @action(
        detail=False,
        methods=['get'],
        url_path='my-restaurants'
    )
    def my_restaurants(self, request):
        """
        GET /api/restaurants/restaurants/my-restaurants/
        Dùng cho trang quản lý của Partner:
        - Partner: chỉ nhà hàng của mình (mọi trạng thái: PENDING, APPROVED, REJECTED...)
        - Admin: thấy tất cả
        """
        user = request.user
        role = getattr(user, "role", None)

        if role == 'ADMIN':
            restaurants = Restaurant.objects.all()
        elif role == 'PARTNER':
            restaurants = Restaurant.objects.filter(partner__user=user)
        else:
            return Response(
                {'error': 'Only partners and admins can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Sắp xếp theo thời gian tạo mới nhất
        restaurants = restaurants.order_by('-created_at')
        
        serializer = RestaurantListSerializer(restaurants, many=True)
        return Response(serializer.data)

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[AllowAny],
        url_path='search'
    )
    def search(self, request):
        """
        GET /api/restaurants/restaurants/search/?city=...&district=...&ward=...&query=...
        
        Tìm kiếm nhà hàng theo:
        - city: Tên tỉnh/thành phố (optional)
        - district: Tên quận/huyện (optional)
        - ward: Tên phường/xã (optional)
        - query: Tìm kiếm theo tên nhà hàng hoặc tên món ăn (optional, fuzzy search)
        
        Trả về danh sách nhà hàng khớp với điều kiện
        """
        city = request.query_params.get('city', '').strip()
        district = request.query_params.get('district', '').strip()
        ward = request.query_params.get('ward', '').strip()
        query = request.query_params.get('query', '').strip()
        
        # Bắt đầu với queryset của APPROVED restaurants (public view)
        queryset = Restaurant.objects.filter(status='APPROVED')
        
        # Lọc theo location (city/district/ward)
        if city:
            queryset = queryset.filter(location__city__icontains=city)
        if district:
            queryset = queryset.filter(location__district__icontains=district)
        if ward:
            queryset = queryset.filter(location__ward__icontains=ward)
        
        # Lọc theo query (tên nhà hàng hoặc tên món ăn) - fuzzy search
        if query:
            from rapidfuzz import fuzz
            
            # Lấy tất cả nhà hàng từ queryset hiện tại
            restaurants = list(queryset)
            filtered_restaurants = []
            
            for restaurant in restaurants:
                # Kiểm tra tên nhà hàng
                name_score = fuzz.token_set_ratio(query.lower(), restaurant.name.lower())
                
                # Kiểm tra tên món ăn
                menu_items = restaurant.menu_items.filter(is_available=True)
                menu_score = 0
                for item in menu_items:
                    item_score = fuzz.token_set_ratio(query.lower(), item.name.lower())
                    if item_score > menu_score:
                        menu_score = item_score
                
                # Nếu điểm >= 60 (tương đối khớp), thêm vào kết quả
                max_score = max(name_score, menu_score)
                if max_score >= 60:
                    filtered_restaurants.append({
                        'restaurant': restaurant,
                        'score': max_score
                    })
            
            # Sắp xếp theo điểm số giảm dần
            filtered_restaurants.sort(key=lambda x: x['score'], reverse=True)
            results = [item['restaurant'] for item in filtered_restaurants]
        else:
            # Sắp xếp theo rating
            results = list(queryset.order_by('-rating'))
        
        # Serialize
        serializer = RestaurantListSerializer(results, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })

    @action(
        detail=True,
        methods=['get'],
        permission_classes=[AllowAny],
        url_path='available-slots'
    )
    def available_slots(self, request, pk=None):
        """
        GET /api/restaurants/restaurants/{id}/available-slots/?date=2025-01-20
        Trả về danh sách time slots còn trống cho ngày cụ thể
        """
        restaurant = self.get_object()
        date_str = request.query_params.get('date')

        if not date_str:
            return Response(
                {'error': 'Date parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from datetime import datetime
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )

        available_slots = restaurant.get_available_slots(date)
        serializer = TimeSlotSerializer(available_slots, many=True)

        return Response({
            'date': date_str,
            'available_slots': serializer.data
        })   


class RestaurantImageViewSet(viewsets.ModelViewSet):
    """
    API endpoint cho Restaurant Images
    - GET: Public
    - POST/PUT/DELETE: Partner owner hoặc Admin
    """
    queryset = RestaurantImage.objects.all()
    serializer_class = RestaurantImageSerializer
    permission_classes = [IsPartnerOrReadOnly, IsPartnerOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        restaurant_id = self.request.query_params.get('restaurant_id')
        if restaurant_id:
            queryset = queryset.filter(restaurant_id=restaurant_id)
        return queryset

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def upload(self, request):
        """
        POST /api/restaurants/images/upload/
        Upload ảnh nhà hàng

        Form-data:
        - image: File (required)
        - restaurant_id: int (required)
        - display_order: int (optional, default=0)
        """
        image_file = request.FILES.get('image')
        restaurant_id = request.data.get('restaurant_id')
        display_order = request.data.get('display_order', 0)

        if not image_file:
            return Response(
                {'error': 'Image file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not restaurant_id:
            return Response(
                {'error': 'restaurant_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file extension
        allowed_extensions = ['jpg', 'jpeg', 'png']
        ext = image_file.name.split('.')[-1].lower()
        if ext not in allowed_extensions:
            return Response(
                {'error': f'Only {", ".join(allowed_extensions)} files are allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (5MB max)
        if image_file.size > 5 * 1024 * 1024:
            return Response(
                {'error': 'Image size must be less than 5MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            restaurant = Restaurant.objects.get(id=restaurant_id)
        except Restaurant.DoesNotExist:
            return Response(
                {'error': 'Restaurant not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check permission
        if request.user.role == 'PARTNER':
            if restaurant.partner.user != request.user:
                return Response(
                    {'error': 'You can only upload images to your own restaurant'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif request.user.role != 'ADMIN':
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Create RestaurantImage
        restaurant_image = RestaurantImage.objects.create(
            restaurant=restaurant,
            image=image_file,
            display_order=int(display_order)
        )

        serializer = RestaurantImageSerializer(restaurant_image)

        return Response(
            {
                'message': 'Image uploaded successfully',
                'data': serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        """
        PUT /api/restaurants/images/{id}/
        Chỉ update display_order (không cho update ảnh)
        """
        instance = self.get_object()
        display_order = request.data.get('display_order')

        if display_order is not None:
            instance.display_order = int(display_order)
            instance.save()

        serializer = self.get_serializer(instance)
        return Response({
            'message': 'Display order updated successfully',
            'data': serializer.data
        })


class MenuItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint cho Menu Items
    - GET: Public
    - POST/PUT/DELETE: Partner owner hoặc Admin
    """
    queryset = MenuItem.objects.all()
    permission_classes = [IsPartnerOrReadOnly, IsPartnerOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'is_available']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MenuItemCreateUpdateSerializer
        return MenuItemSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        restaurant_id = self.request.query_params.get('restaurant_id')
        if restaurant_id:
            queryset = queryset.filter(restaurant_id=restaurant_id)
        return queryset

    def create(self, request, *args, **kwargs):
        """
        POST /api/restaurants/menu-items/
        Tạo menu item (không có ảnh)
        """
        restaurant_id = request.data.get('restaurant_id')

        if not restaurant_id:
            return Response(
                {'error': 'restaurant_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            restaurant = Restaurant.objects.get(id=restaurant_id)
        except Restaurant.DoesNotExist:
            return Response(
                {'error': 'Restaurant not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check permission
        if request.user.role == 'PARTNER':
            if restaurant.partner.user != request.user:
                return Response(
                    {'error': 'You can only add menu items to your own restaurant'},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        menu_item = serializer.save(restaurant=restaurant)

        # Return với MenuItemSerializer để có image_url
        response_serializer = MenuItemSerializer(menu_item)

        return Response(
            {
                'message': 'Menu item created successfully',
                'data': response_serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated, IsPartnerOwner],
        url_path='upload-image'
    )
    def upload_image(self, request, pk=None):
        """
        POST /api/restaurants/menu-items/{id}/upload-image/
        Upload ảnh cho món ăn

        Form-data:
        - image: File (required)
        """
        menu_item = self.get_object()
        image_file = request.FILES.get('image')

        if not image_file:
            return Response(
                {'error': 'Image file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file extension
        allowed_extensions = ['jpg', 'jpeg', 'png']
        ext = image_file.name.split('.')[-1].lower()
        if ext not in allowed_extensions:
            return Response(
                {'error': f'Only {", ".join(allowed_extensions)} files are allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (5MB max)
        if image_file.size > 5 * 1024 * 1024:
            return Response(
                {'error': 'Image size must be less than 5MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update image
        menu_item.image = image_file
        menu_item.save()

        serializer = MenuItemSerializer(menu_item)

        return Response(
            {
                'message': 'Image uploaded successfully',
                'data': serializer.data
            },
            status=status.HTTP_200_OK
        )

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated, IsPartnerOwner],
        url_path='toggle-availability'
    )
    def toggle_availability(self, request, pk=None):
        """
        POST /api/restaurants/menu-items/{id}/toggle-availability/
        Bật/tắt is_available
        """
        menu_item = self.get_object()
        menu_item.is_available = not menu_item.is_available
        menu_item.save()

        serializer = MenuItemSerializer(menu_item)
        return Response({
            'message': f'Menu item is now {"available" if menu_item.is_available else "unavailable"}',
            'data': serializer.data
        })


class TimeSlotViewSet(viewsets.ModelViewSet):
    """
    API endpoint cho Time Slots
    - GET: Public
    - POST/PUT/DELETE: Partner owner hoặc Admin
    """
    queryset = TimeSlot.objects.all()
    serializer_class = TimeSlotSerializer
    permission_classes = [IsPartnerOrReadOnly, IsPartnerOwner]

    def get_queryset(self):
        queryset = super().get_queryset()
        restaurant_id = self.request.query_params.get('restaurant_id')
        if restaurant_id:
            queryset = queryset.filter(restaurant_id=restaurant_id)
        return queryset.order_by('start_time')

    def create(self, request, *args, **kwargs):
        restaurant_id = request.data.get('restaurant_id')

        if not restaurant_id:
            return Response(
                {'error': 'restaurant_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            restaurant = Restaurant.objects.get(id=restaurant_id)
        except Restaurant.DoesNotExist:
            return Response(
                {'error': 'Restaurant not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check permission
        if request.user.role == 'PARTNER':
            if restaurant.partner.user != request.user:
                return Response(
                    {'error': 'You can only add time slots to your own restaurant'},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(restaurant=restaurant)

        return Response(
            {
                'message': 'Time slot created successfully',
                'data': serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated, IsPartnerOwner],
        url_path='toggle-active'
    )
    def toggle_active(self, request, pk=None):
        """
        POST /api/restaurants/time-slots/{id}/toggle-active/
        Bật/tắt is_active
        """
        time_slot = self.get_object()
        time_slot.is_active = not time_slot.is_active
        time_slot.save()

        serializer = self.get_serializer(time_slot)
        return Response({
            'message': f'Time slot is now {"active" if time_slot.is_active else "inactive"}',
            'data': serializer.data
        })

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[AllowAny],
        url_path='check-availability'
    )
    def check_availability(self, request):
        """
        POST /api/restaurants/time-slots/check-availability/
        Body: {
            "restaurant_id": 1,
            "date": "2025-01-20",
            "time_slot_id": 3
        }
        """
        serializer = TimeSlotAvailabilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        restaurant_id = serializer.validated_data['restaurant_id']
        date = serializer.validated_data['date']
        time_slot_id = serializer.validated_data.get('time_slot_id')

        restaurant = Restaurant.objects.get(id=restaurant_id)

        if time_slot_id:
            # Check specific slot
            try:
                time_slot = TimeSlot.objects.get(id=time_slot_id, restaurant=restaurant)
            except TimeSlot.DoesNotExist:
                return Response(
                    {'error': 'Time slot not found for this restaurant'},
                    status=status.HTTP_404_NOT_FOUND
                )

            is_available = time_slot.is_available(date)
            current_count = time_slot.get_current_booking_count(date)

            return Response({
                'available': is_available,
                'time_slot': TimeSlotSerializer(time_slot).data,
                'current_bookings': current_count,
                'max_bookings': time_slot.max_bookings
            })
        else:
            # Return all available slots
            available_slots = restaurant.get_available_slots(date)
            return Response({
                'date': str(date),
                'available_slots': TimeSlotSerializer(available_slots, many=True).data
            })
