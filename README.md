# Hệ Thống Đặt Bàn Nhà Hàng

Đồ án môn Hệ Thống Thông Tin - Hệ thống đặt bàn nhà hàng với chatbot AI hỗ trợ.

## Cấu trúc project

```
datbanan/
├── be/           # Backend Django
├── fe/           # Frontend React + Vite
└── README.md     # File này
```

## Yêu cầu hệ thống

- Python 3.8+
- Node.js 16+
- PostgreSQL/MySQL (hoặc SQLite để test)

---

## Hướng dẫn cài đặt Backend (Django)

### 1. Di chuyển vào thư mục backend
```bash
cd be
```

### 2. Tạo và kích hoạt môi trường ảo

**Windows:**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Cài đặt các thư viện cần thiết
```bash
pip install -r requirements.txt
```

### 4. Cấu hình Database

Mở file `project/settings.py` và chỉnh sửa cấu hình database:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',  # hoặc 'mysql', 'sqlite3'
        'NAME': 'ten_database',
        'USER': 'username',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',  # 3306 cho MySQL
    }
}
```

**Lưu ý:** Để test nhanh, có thể dùng SQLite (mặc định):
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### 5. Chạy migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Tạo superuser (admin)
```bash
python manage.py createsuperuser
```

### 7. Chạy server
```bash
python manage.py runserver
```

Backend sẽ chạy tại: `http://localhost:8000`

---

## Hướng dẫn cài đặt Frontend (React + Vite)

### 1. Di chuyển vào thư mục frontend
```bash
cd fe
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Chạy development server
```bash
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173` (hoặc port khác nếu 5173 đã được sử dụng)

### 4. Build cho production
```bash
npm run build
```

---

## Tính năng chính

- 🍽️ Quản lý nhà hàng và menu
- 📅 Đặt bàn trực tuyến
- 👥 Quản lý tài khoản người dùng
- 🔔 Thông báo đặt bàn
- 🤖 **Chatbot AI hỗ trợ khách hàng** (xem chi tiết tại `/be/chatbot/CHATBOT_README.md`)

---

## Lưu ý

- Đảm bảo backend đang chạy trước khi chạy frontend
- Kiểm tra cấu hình CORS trong Django settings nếu gặp lỗi kết nối
- File `.env` cần được tạo riêng cho môi trường production

