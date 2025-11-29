# TÀI LIỆU DỰ ÁN - WEB ĐẶT BÀN ĂN

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Mô tả
Web đặt bàn ăn trung gian kết nối **Khách hàng** và **Nhà hàng (Partner)**. Admin quản lý toàn bộ hệ thống.

### 1.2 Công nghệ
- **Backend:** Django + Django REST Framework
- **Database:** MySQL
- **Authentication:** JWT (Simple JWT)
- **Database name:** `tablebooking_db`

### 1.3 Vai trò người dùng
- **CUSTOMER:** Khách hàng đặt bàn
- **PARTNER:** Chủ nhà hàng
- **ADMIN:** Quản trị viên

---

## 2. CẤU TRÚC DATABASE

### 2.1 Sơ đồ quan hệ tổng quan
```
users (1) ---< (0..1) customers
users (1) ---< (0..1) partners

partners (1) ---< (*) restaurants
restaurants (*) ---< (1) locations
restaurants (1) ---< (*) restaurant_images
restaurants (1) ---< (*) menu_items
restaurants (1) ---< (*) time_slots
restaurants (1) ---< (*) bookings

users (1) ---< (*) bookings
time_slots (1) ---< (*) bookings
users (1) ---< (*) notifications
```

### 2.2 Chi tiết các bảng

#### **users** (Bảng người dùng chung)
```sql
- id: BIGINT PK AUTO_INCREMENT
- phone_number: VARCHAR(20) UNIQUE NOT NULL (dùng để đăng nhập)
- password_hash: VARCHAR(255) NOT NULL
- email: VARCHAR(100) NULL
- full_name: VARCHAR(100) NULL
- role: ENUM('CUSTOMER','PARTNER','ADMIN') NOT NULL
- created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
- is_active: BOOLEAN DEFAULT TRUE
```

#### **customers** (Thông tin khách hàng)
```sql
- user_id: BIGINT PK FK(users.id)
- date_of_birth: DATE NULL
- address: VARCHAR(255) NULL
- loyalty_points: INT DEFAULT 0 (điểm tích lũy)
- total_bookings: INT DEFAULT 0 (tổng số lần đặt)
```

#### **partners** (Thông tin đối tác)
```sql
- user_id: BIGINT PK FK(users.id)
- business_name: VARCHAR(150) NOT NULL
- business_license: VARCHAR(100) NULL (giấy phép kinh doanh)
- tax_code: VARCHAR(50) NULL (mã số thuế)
- status: ENUM('PENDING','ACTIVE','SUSPENDED') DEFAULT 'PENDING'
```

#### **locations** (Địa điểm)
```sql
- id: BIGINT PK AUTO_INCREMENT
- city: VARCHAR(100) NOT NULL
- district: VARCHAR(100) NULL
- ward: VARCHAR(100) NULL
```

#### **restaurants** (Nhà hàng)
```sql
- id: BIGINT PK AUTO_INCREMENT
- partner_id: BIGINT FK(partners.user_id)
- name: VARCHAR(150) NOT NULL
- address: VARCHAR(255) NOT NULL
- phone_number: VARCHAR(20) NULL
- description: TEXT NULL
- opening_hours: VARCHAR(100) NULL (VD: "10:00-22:00")
- slot_duration: INT DEFAULT 120 (thời gian 1 slot - phút)
- status: ENUM('PENDING','APPROVED','SUSPENDED','CLOSED') DEFAULT 'PENDING'
- rating: DECIMAL(3,2) DEFAULT 0.00
- location_id: BIGINT FK(locations.id)
- created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at: DATETIME ON UPDATE CURRENT_TIMESTAMP
```

#### **time_slots** (Khung giờ đặt bàn)
```sql
- id: BIGINT PK AUTO_INCREMENT
- restaurant_id: BIGINT FK(restaurants.id)
- start_time: TIME NOT NULL (VD: 11:00)
- end_time: TIME NOT NULL (VD: 13:00)
- max_bookings: INT DEFAULT 10 (giới hạn số booking/slot)
- is_active: BOOLEAN DEFAULT TRUE
```

#### **restaurant_images** (Ảnh nhà hàng)
```sql
- id: BIGINT PK AUTO_INCREMENT
- restaurant_id: BIGINT FK(restaurants.id)
- image_url: VARCHAR(255) NOT NULL
- display_order: INT DEFAULT 0 (thứ tự hiển thị)
```

#### **menu_items** (Món ăn)
```sql
- id: BIGINT PK AUTO_INCREMENT
- restaurant_id: BIGINT FK(restaurants.id)
- name: VARCHAR(150) NOT NULL
- description: TEXT NULL
- price: DECIMAL(10,2) NOT NULL
- image_url: VARCHAR(255) NULL
- category: VARCHAR(100) NULL (VD: "Món chính", "Đồ uống")
- is_available: BOOLEAN DEFAULT TRUE
```

#### **bookings** (Đơn đặt bàn)
```sql
- id: BIGINT PK AUTO_INCREMENT
- customer_id: BIGINT FK(users.id)
- restaurant_id: BIGINT FK(restaurants.id)
- time_slot_id: BIGINT FK(time_slots.id)
- booking_date: DATE NOT NULL
- number_of_guests: INT NOT NULL
- special_request: TEXT NULL (yêu cầu đặc biệt)
- status: ENUM('PENDING','CONFIRMED','REJECTED','CANCELLED','COMPLETED','NO_SHOW')
- created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
- confirmed_at: DATETIME NULL
```

#### **notifications** (Thông báo)
```sql
- id: BIGINT PK AUTO_INCREMENT
- user_id: BIGINT FK(users.id)
- title: VARCHAR(150) NOT NULL
- message: TEXT NOT NULL
- type: VARCHAR(50) NULL (VD: 'BOOKING', 'SYSTEM')
- sent_at: DATETIME DEFAULT CURRENT_TIMESTAMP
- is_read: BOOLEAN DEFAULT FALSE
```

---

## 3. CẤU TRÚC APPS DJANGO

### 3.1 App `accounts` ✅ (ĐÃ HOÀN THÀNH)

**Mục đích:** Quản lý người dùng, đăng ký, đăng nhập

**Models:**
- User (phone_number, email, full_name, role, password)
- Customer (date_of_birth, address, loyalty_points, total_bookings)
- Partner (business_name, business_license, tax_code, status)

**API Endpoints:**
```
POST /api/accounts/register/customer/
POST /api/accounts/register/partner/
POST /api/accounts/login/
GET  /api/accounts/profile/
PUT  /api/accounts/profile/
POST /api/accounts/logout/
```

**Chức năng:**
- ✅ Đăng ký khách hàng (phone, password, full_name, email)
- ✅ Đăng ký đối tác (thêm business_name, business_license, tax_code)
- ✅ Đăng nhập bằng phone_number
- ✅ Xem/cập nhật profile
- ✅ Đăng xuất (blacklist token)

**Đặc điểm:**
- Sử dụng JWT authentication
- Role-based: CUSTOMER, PARTNER, ADMIN
- OneToOneField giữa User và Customer/Partner

---

### 3.2 App `restaurants` (ĐANG LÀM)

**Mục đích:** Quản lý nhà hàng, menu, ảnh, khung giờ

**Models:**
- Location (city, district, ward)
- Restaurant (partner_id, name, address, location_id, status, rating...)
- RestaurantImage (restaurant_id, image_url, display_order)
- MenuItem (restaurant_id, name, price, category, is_available)
- TimeSlot (restaurant_id, start_time, end_time, max_bookings)

**API Endpoints (dự kiến):**
```
# Location
GET  /api/restaurants/locations/
POST /api/restaurants/locations/ (admin only)

# Restaurant
GET  /api/restaurants/                    (list all - public)
POST /api/restaurants/                    (partner create)
GET  /api/restaurants/<id>/               (detail - public)
PUT  /api/restaurants/<id>/               (partner update)
DELETE /api/restaurants/<id>/             (partner/admin)

# Restaurant Images
POST /api/restaurants/<id>/images/        (partner upload)
DELETE /api/restaurants/images/<img_id>/  (partner delete)

# Menu Items
GET  /api/restaurants/<id>/menu/          (public)
POST /api/restaurants/<id>/menu/          (partner create)
PUT  /api/restaurants/menu/<item_id>/     (partner update)
DELETE /api/restaurants/menu/<item_id>/   (partner delete)

# Time Slots
GET  /api/restaurants/<id>/time-slots/    (public)
POST /api/restaurants/<id>/time-slots/    (partner create)
PUT  /api/restaurants/time-slots/<id>/    (partner update)
DELETE /api/restaurants/time-slots/<id>/  (partner delete)
```

**Chức năng:**
- Partner tạo/sửa/xóa nhà hàng
- Partner upload ảnh nhà hàng
- Partner quản lý menu (thêm/sửa/xóa món)
- Partner tạo khung giờ đặt bàn (VD: 11:00-13:00, max 10 booking)
- Customer xem danh sách nhà hàng (filter theo location, rating)
- Customer xem chi tiết nhà hàng (ảnh, menu, giờ mở cửa)
- Customer xem khung giờ còn trống

**Permission:**
- List/Detail: Public (không cần đăng nhập)
- Create/Update/Delete: Partner (chỉ được thao tác với nhà hàng của mình)
- Admin có thể approve/reject restaurant

---

### 3.3 App `bookings` (ƯU TIÊN CAO)

**Mục đích:** Quản lý đặt bàn

**Models:**
- Booking (customer_id, restaurant_id, time_slot_id, booking_date, number_of_guests, status)

**API Endpoints (dự kiến):**
```
# Customer
GET  /api/bookings/                       (my bookings)
POST /api/bookings/                       (create booking)
GET  /api/bookings/<id>/                  (detail)
PUT  /api/bookings/<id>/cancel/           (cancel booking)

# Partner
GET  /api/bookings/restaurant/<rest_id>/  (bookings của nhà hàng)
PUT  /api/bookings/<id>/confirm/          (xác nhận)
PUT  /api/bookings/<id>/reject/           (từ chối)
PUT  /api/bookings/<id>/complete/         (hoàn thành)
PUT  /api/bookings/<id>/no-show/          (khách không đến)

# Check slot available
GET  /api/bookings/check-available/       (params: restaurant_id, date, time_slot_id)
```

**Chức năng:**
- Customer tạo booking (chọn nhà hàng, ngày, khung giờ, số người)
- Kiểm tra khung giờ còn chỗ trống (dựa vào max_bookings)
- Customer xem lịch sử đặt bàn
- Customer hủy booking (nếu status = PENDING)
- Partner xem danh sách booking của nhà hàng
- Partner xác nhận/từ chối booking
- Partner đánh dấu completed/no-show
- Tự động gửi notification khi status thay đổi

**Business Logic:**
- Status flow: PENDING → CONFIRMED/REJECTED
- CONFIRMED → COMPLETED/NO_SHOW/CANCELLED
- Không cho phép đặt quá khứ
- Kiểm tra slot còn chỗ trống (count bookings với status != CANCELLED/REJECTED)

---

### 3.4 App `notifications` (ƯU TIÊN TRUNG BÌNH)

**Mục đích:** Gửi thông báo cho user

**Models:**
- Notification (user_id, title, message, type, is_read)

**API Endpoints (dự kiến):**
```
GET  /api/notifications/           (my notifications)
GET  /api/notifications/<id>/      (detail)
PUT  /api/notifications/<id>/read/ (mark as read)
DELETE /api/notifications/<id>/    (delete)
PUT  /api/notifications/read-all/  (mark all as read)
```

**Chức năng:**
- Tự động gửi notification khi:
  - Booking được tạo (gửi cho partner)
  - Booking được confirm/reject (gửi cho customer)
  - Booking bị cancel (gửi cho partner)
  - Restaurant được approve (gửi cho partner)
- User xem danh sách notification
- Đánh dấu đã đọc
- Xóa notification

**Trigger points:**
- Trong `bookings/views.py`: sau khi create/confirm/reject/cancel
- Trong `restaurants/views.py`: sau khi admin approve
- Có thể dùng Django signals để tách logic

---

### 3.5 App `admin_panel` (ƯU TIÊN THẤP)

**Mục đích:** Admin quản lý hệ thống

**API Endpoints (dự kiến):**
```
# Partner Management
GET  /api/admin/partners/                 (list pending partners)
PUT  /api/admin/partners/<id>/approve/    (approve partner)
PUT  /api/admin/partners/<id>/suspend/    (suspend partner)

# Restaurant Management
GET  /api/admin/restaurants/              (list pending restaurants)
PUT  /api/admin/restaurants/<id>/approve/ (approve restaurant)
PUT  /api/admin/restaurants/<id>/suspend/ (suspend restaurant)

# Statistics
GET  /api/admin/stats/                    (tổng quan hệ thống)
GET  /api/admin/stats/bookings/           (thống kê booking)
GET  /api/admin/stats/revenue/            (doanh thu - nếu có)
```

**Chức năng:**
- Admin duyệt partner (status: PENDING → ACTIVE)
- Admin duyệt nhà hàng (status: PENDING → APPROVED)
- Admin tạm ngừng partner/restaurant (SUSPENDED)
- Xem thống kê:
  - Tổng số user, partner, restaurant, booking
  - Booking theo ngày/tháng
  - Top nhà hàng có nhiều booking nhất
  - Tỷ lệ cancel/complete

**Đặc điểm:**
- Chỉ user có role=ADMIN mới truy cập được
- Có thể dùng Django Admin tạm thay thế giai đoạn đầu

---

## 4. LUỒNG HOẠT ĐỘNG CHÍNH

### 4.1 Luồng Partner tạo nhà hàng
```
1. Partner đăng ký → status = PENDING
2. Admin duyệt partner → status = ACTIVE
3. Partner tạo restaurant → status = PENDING
4. Admin duyệt restaurant → status = APPROVED
5. Partner thêm ảnh, menu, time slots
6. Customer có thể xem và đặt bàn
```

### 4.2 Luồng Customer đặt bàn
```
1. Customer tìm kiếm nhà hàng (theo location, rating)
2. Customer xem chi tiết nhà hàng (ảnh, menu)
3. Customer chọn ngày, khung giờ, số người
4. Hệ thống check slot còn chỗ → tạo booking (status = PENDING)
5. Partner nhận notification
6. Partner xác nhận → booking status = CONFIRMED
7. Customer nhận notification
8. Đến ngày ăn → Partner đánh dấu COMPLETED/NO_SHOW
```

### 4.3 Luồng hủy booking
```
- Customer hủy (khi status = PENDING/CONFIRMED):
  → booking status = CANCELLED
  → Partner nhận notification
  
- Partner từ chối (khi status = PENDING):
  → booking status = REJECTED
  → Customer nhận notification
```

---

## 5. AUTHENTICATION & PERMISSION

### 5.1 Authentication
- Sử dụng JWT (djangorestframework-simplejwt)
- Access token: 1 giờ
- Refresh token: 7 ngày
- Header: `Authorization: Bearer <access_token>`

### 5.2 Permission Rules
```python
# Public (không cần đăng nhập)
- Xem danh sách nhà hàng
- Xem chi tiết nhà hàng
- Xem menu, ảnh

# Customer (role=CUSTOMER)
- Tạo booking
- Xem/hủy booking của mình
- Cập nhật profile

# Partner (role=PARTNER, status=ACTIVE)
- Tạo/sửa/xóa nhà hàng (chỉ của mình)
- Quản lý menu, ảnh, time slots
- Xem/xác nhận/từ chối booking của nhà hàng mình
- Cập nhật profile

# Admin (role=ADMIN)
- Duyệt partner, restaurant
- Suspend/Unsuspend
- Xem thống kê
- Quản lý toàn bộ hệ thống
```

---

## 6. QUY ƯỚC CODING

### 6.1 Model naming
- Singular: `Restaurant`, `Booking`, `User`
- db_table: lowercase, plural: `'restaurants'`, `'bookings'`

### 6.2 Field naming
- snake_case: `full_name`, `phone_number`, `created_at`
- Foreign Key: `user_id`, `restaurant_id`, `partner_id`

### 6.3 API Response format
```json
// Success
{
  "message": "Thành công",
  "data": {...}
}

// Error
{
  "error": "Mô tả lỗi"
}
```

### 6.4 Status naming
- UPPERCASE: `PENDING`, `ACTIVE`, `CONFIRMED`
- Sử dụng ENUM trong models

---

## 7. NOTES & CONSTRAINTS

### 7.1 Business Rules
- Partner phải được admin duyệt mới tạo nhà hàng
- Restaurant phải được admin duyệt mới hiển thị public
- Không đặt bàn quá khứ
- Không đặt bàn khi slot đã full
- Customer chỉ hủy được khi status = PENDING/CONFIRMED
- Partner chỉ từ chối được khi status = PENDING

### 7.2 Chức năng TẠM KHÔNG LÀM
- ❌ Đặt cọc/thanh toán online
- ❌ Review/đánh giá nhà hàng
- ❌ Voucher/khuyến mãi
- ❌ Quản lý từng bàn ăn cụ thể
- ❌ Đặt món trước
- ❌ Hoa hồng/phí nền tảng

### 7.3 Có thể mở rộng sau
- Rating/Review system
- Loyalty program (dùng loyalty_points)
- Payment integration
- Email/SMS notification
- Real-time chat
- Analytics dashboard

---

## 8. TRẠNG THÁI DỰ ÁN

### ✅ Đã hoàn thành
- [x] Database design
- [x] App `accounts` (User, Customer, Partner)
- [x] Authentication (JWT)
- [x] Register/Login/Profile API
- [x] App `restaurants`
- [x] App `bookings`

### 🔄 Đang làm
- [ ] App `notifications`

### 📋 Chưa làm
- [ ] App `admin_panel`
- [ ] Frontend

---

## 9. HƯỚNG DẪN SỬ DỤNG TÀI LIỆU NÀY

1. **Đọc phần 1-2:** Hiểu tổng quan project và database
2. **Đọc phần 3:** Biết từng app làm gì, có những API nào
3. **Đọc phần 4:** Hiểu luồng hoạt động
4. **Đọc phần 7:** Biết giới hạn và quy tắc


