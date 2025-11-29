import { Mail, Lock, User, Phone, Utensils } from 'lucide-react';

export function Register() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-orange-600 p-3 rounded-2xl">
              <Utensils className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Tạo tài khoản</h1>
          <p className="text-gray-600">Đăng ký để bắt đầu đặt bàn ngay hôm nay</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-5">
            <div>
              <label htmlFor="fullname" className="block text-sm font-semibold text-gray-700 mb-2">
                Họ và tên
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="fullname"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="phone"
                  type="tel"
                  placeholder="0912345678"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Tối thiểu 8 ký tự, bao gồm chữ và số</p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700 mb-2">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                className="w-4 h-4 mt-1 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                required
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                Tôi đồng ý với{' '}
                <a href="#" className="text-orange-600 hover:text-orange-700 font-medium">
                  Điều khoản sử dụng
                </a>{' '}
                và{' '}
                <a href="#" className="text-orange-600 hover:text-orange-700 font-medium">
                  Chính sách bảo mật
                </a>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 text-white py-3 rounded-xl hover:bg-orange-700 transition font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              Đăng ký
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Hoặc đăng ký với</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition font-medium">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button className="flex items-center justify-center px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition font-medium">
                <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-gray-600">
          Đã có tài khoản?{' '}
          <a href="/login" className="text-orange-600 hover:text-orange-700 font-semibold">
            Đăng nhập ngay
          </a>
        </p>

        <div className="text-center mt-4">
          <a href="/" className="text-gray-600 hover:text-orange-600 font-medium transition">
            ← Quay về trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
