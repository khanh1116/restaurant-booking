# bookings/tests.py
from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User, Partner
from restaurants.models import Restaurant, TimeSlot, Location
from .models import Booking


class BookingModelTestCase(TestCase):
    """Test cho Booking model"""
    
    def setUp(self):
        # Tạo customer (User)
        self.customer = User.objects.create_user(
            phone_number="0901234567",
            password="test123",
            full_name="Test Customer",
            role="CUSTOMER",
        )

        # Tạo partner user
        self.partner_user = User.objects.create_user(
            phone_number="0909876543",
            password="test123",
            full_name="Test Partner",
            role="PARTNER",
        )

        # Tạo Partner gắn với user ở trên
        self.partner = Partner.objects.create(
            user=self.partner_user,
            # TODO: nếu model Partner có field bắt buộc khác thì thêm vào đây
            # ví dụ: business_name="Test Business"
        )

        # Location
        self.location = Location.objects.create(city="Hà Nội")

        # Restaurant – dùng Partner, không dùng User
        self.restaurant = Restaurant.objects.create(
            partner=self.partner,
            name="Test Restaurant",
            address="Test Address",
            location=self.location,
            status="APPROVED",
        )

        # Time slot
        self.time_slot = TimeSlot.objects.create(
            restaurant=self.restaurant,
            start_time="11:00",
            end_time="13:00",
            max_bookings=5,
            is_active=True,
        )

    def test_create_booking_success(self):
        """Test tạo booking thành công"""
        booking = Booking.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            time_slot=self.time_slot,
            booking_date=date.today() + timedelta(days=1),
            number_of_guests=4,
            status="PENDING",
        )
        self.assertEqual(booking.status, "PENDING")
        self.assertIsNotNone(booking.created_at)

    def test_booking_past_date_fails(self):
        """Test không cho đặt bàn ngày quá khứ"""
        with self.assertRaises(Exception):
            booking = Booking(
                customer=self.customer,
                restaurant=self.restaurant,
                time_slot=self.time_slot,
                booking_date=date.today() - timedelta(days=1),
                number_of_guests=4,
            )
            booking.save()

    def test_count_bookings_for_slot(self):
        """Test đếm số booking cho slot"""
        tomorrow = date.today() + timedelta(days=1)

        # Tạo 3 bookings
        for _ in range(3):
            Booking.objects.create(
                customer=self.customer,
                restaurant=self.restaurant,
                time_slot=self.time_slot,
                booking_date=tomorrow,
                number_of_guests=2,
                status="PENDING",
            )

        count = Booking.count_bookings_for_slot(
            self.restaurant.id, tomorrow, self.time_slot.id
        )
        self.assertEqual(count, 3)

    def test_is_slot_available(self):
        """Test check slot availability"""
        tomorrow = date.today() + timedelta(days=1)

        # Tạo 4 bookings (max là 5)
        for _ in range(4):
            Booking.objects.create(
                customer=self.customer,
                restaurant=self.restaurant,
                time_slot=self.time_slot,
                booking_date=tomorrow,
                number_of_guests=2,
                status="PENDING",
            )

        # Slot vẫn available
        available, message = Booking.is_slot_available(
            self.restaurant.id, tomorrow, self.time_slot.id
        )
        self.assertTrue(available)

        # Tạo thêm 1 booking nữa -> đầy
        Booking.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            time_slot=self.time_slot,
            booking_date=tomorrow,
            number_of_guests=2,
            status="PENDING",
        )

        available, message = Booking.is_slot_available(
            self.restaurant.id, tomorrow, self.time_slot.id
        )
        self.assertFalse(available)


class BookingAPITestCase(TestCase):
    """Test cho Booking API"""

    def setUp(self):
        self.client = APIClient()

        # Tạo customer
        self.customer = User.objects.create_user(
            phone_number="0901234567",
            password="test123",
            full_name="Test Customer",
            role="CUSTOMER",
        )

        # Tạo partner user
        self.partner_user = User.objects.create_user(
            phone_number="0909876543",
            password="test123",
            full_name="Test Partner",
            role="PARTNER",
        )

        # Tạo Partner model
        self.partner = Partner.objects.create(
            user=self.partner_user,
            # TODO: thêm field bắt buộc khác nếu có
        )

        # Restaurant
        self.location = Location.objects.create(city="Hà Nội")
        self.restaurant = Restaurant.objects.create(
            partner=self.partner,
            name="Test Restaurant",
            address="Test Address",
            location=self.location,
            status="APPROVED",
        )

        # Time slot
        self.time_slot = TimeSlot.objects.create(
            restaurant=self.restaurant,
            start_time="11:00",
            end_time="13:00",
            max_bookings=5,
            is_active=True,
        )

    def test_customer_create_booking(self):
        """Test customer tạo booking"""
        self.client.force_authenticate(user=self.customer)

        tomorrow = date.today() + timedelta(days=1)
        data = {
            "restaurant": self.restaurant.id,
            "time_slot": self.time_slot.id,
            "booking_date": str(tomorrow),
            "number_of_guests": 4,
            "special_request": "Near window please",
        }

        response = self.client.post("/api/bookings/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Booking.objects.count(), 1)

    def test_customer_cancel_booking(self):
        """Test customer hủy booking"""
        booking = Booking.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            time_slot=self.time_slot,
            booking_date=date.today() + timedelta(days=1),
            number_of_guests=4,
            status="PENDING",
        )

        self.client.force_authenticate(user=self.customer)
        response = self.client.put(f"/api/bookings/{booking.id}/cancel/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "CANCELLED")

    def test_partner_confirm_booking(self):
        """Test partner xác nhận booking"""
        booking = Booking.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            time_slot=self.time_slot,
            booking_date=date.today() + timedelta(days=1),
            number_of_guests=4,
            status="PENDING",
        )

        # Auth bằng user của partner
        self.client.force_authenticate(user=self.partner_user)
        response = self.client.put(f"/api/bookings/{booking.id}/confirm/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "CONFIRMED")
        self.assertIsNotNone(booking.confirmed_at)

    def test_check_availability(self):
        """Test check slot availability qua API"""
        self.client.force_authenticate(user=self.customer)

        tomorrow = date.today() + timedelta(days=1)
        data = {
            "restaurant_id": self.restaurant.id,
            "booking_date": str(tomorrow),
            "time_slot_id": self.time_slot.id,
        }

        response = self.client.post("/api/bookings/check-availability/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["available"])
