import { Search, MapPin, Star, Clock, Users, ChefHat, Utensils } from 'lucide-react';

export default function Home() {
  const featuredRestaurants = [
    {
      id: 1,
      name: 'Nhà Hàng Sài Gòn',
      image: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800',
      cuisine: 'Việt Nam',
      rating: 4.8,
      reviews: 256,
      priceRange: '200.000₫ - 500.000₫',
      location: 'Quận 1, TP.HCM',
      availableSlots: 5
    },
    {
      id: 2,
      name: 'Taste of Japan',
      image: 'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=800',
      cuisine: 'Nhật Bản',
      rating: 4.9,
      reviews: 189,
      priceRange: '300.000₫ - 800.000₫',
      location: 'Quận 3, TP.HCM',
      availableSlots: 3
    },
    {
      id: 3,
      name: 'La Dolce Vita',
      image: 'https://images.pexels.com/photos/1581384/pexels-photo-1581384.jpeg?auto=compress&cs=tinysrgb&w=800',
      cuisine: 'Ý',
      rating: 4.7,
      reviews: 342,
      priceRange: '250.000₫ - 600.000₫',
      location: 'Quận 2, TP.HCM',
      availableSlots: 8
    },
    {
      id: 4,
      name: 'Seoul Garden',
      image: 'https://images.pexels.com/photos/1395964/pexels-photo-1395964.jpeg?auto=compress&cs=tinysrgb&w=800',
      cuisine: 'Hàn Quốc',
      rating: 4.6,
      reviews: 198,
      priceRange: '280.000₫ - 700.000₫',
      location: 'Quận 7, TP.HCM',
      availableSlots: 6
    }
  ];

  const cuisineTypes = [
    { name: 'Việt Nam', icon: '🇻🇳', count: 124 },
    { name: 'Nhật Bản', icon: '🇯🇵', count: 89 },
    { name: 'Hàn Quốc', icon: '🇰🇷', count: 67 },
    { name: 'Ý', icon: '🇮🇹', count: 78 },
    { name: 'Trung Hoa', icon: '🇨🇳', count: 95 },
    { name: 'Thái Lan', icon: '🇹🇭', count: 56 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Utensils className="w-8 h-8 text-orange-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                TableBooking
              </h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-orange-600 font-medium transition">Trang chủ</a>
              <a href="#" className="text-gray-700 hover:text-orange-600 font-medium transition">Nhà hàng</a>
              <a href="#" className="text-gray-700 hover:text-orange-600 font-medium transition">Về chúng tôi</a>
              <a href="/partner" className="text-orange-600 hover:text-orange-700 font-semibold transition">Đối tác</a>
            </nav>
            <div className="flex items-center space-x-4">
              <a href="/login" className="text-gray-700 hover:text-orange-600 font-medium transition">Đăng nhập</a>
              <a href="/register" className="bg-orange-600 text-white px-6 py-2 rounded-full hover:bg-orange-700 transition shadow-md hover:shadow-lg">
                Đăng ký
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="relative bg-gradient-to-r from-orange-600 to-amber-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-5xl font-bold mb-6 leading-tight">
              Đặt bàn nhanh chóng,<br />Thưởng thức tuyệt vời
            </h2>
            <p className="text-xl mb-10 text-orange-100">
              Khám phá hàng nghìn nhà hàng và đặt bàn chỉ trong vài giây
            </p>

            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Tìm nhà hàng, món ăn..."
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none text-gray-800 transition"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Địa điểm"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none text-gray-800 transition"
                  />
                </div>
                <button className="bg-orange-600 text-white px-8 py-4 rounded-xl hover:bg-orange-700 transition font-semibold shadow-lg hover:shadow-xl">
                  Tìm kiếm
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-3xl font-bold text-gray-800 mb-8">Khám phá theo ẩm thực</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cuisineTypes.map((cuisine, index) => (
            <button
              key={index}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition transform hover:-translate-y-1 text-center group"
            >
              <div className="text-4xl mb-3">{cuisine.icon}</div>
              <h4 className="font-semibold text-gray-800 group-hover:text-orange-600 transition">{cuisine.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{cuisine.count} nhà hàng</p>
            </button>
          ))}
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-3xl font-bold text-gray-800">Nhà hàng nổi bật</h3>
            <a href="#" className="text-orange-600 hover:text-orange-700 font-semibold flex items-center">
              Xem tất cả
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredRestaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 cursor-pointer"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-full object-cover transform hover:scale-110 transition duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-white rounded-full px-3 py-1 flex items-center space-x-1 shadow-lg">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold text-sm">{restaurant.rating}</span>
                  </div>
                </div>

                <div className="p-5">
                  <h4 className="text-xl font-bold text-gray-800 mb-2">{restaurant.name}</h4>
                  <p className="text-sm text-gray-600 mb-3 flex items-center">
                    <ChefHat className="w-4 h-4 mr-1 text-orange-600" />
                    {restaurant.cuisine}
                  </p>

                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                    {restaurant.location}
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-gray-600">{restaurant.priceRange}</span>
                    <span className="text-gray-500">({restaurant.reviews} đánh giá)</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center text-sm text-green-600">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="font-medium">{restaurant.availableSlots} bàn trống</span>
                    </div>
                    <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition text-sm font-semibold">
                      Đặt bàn
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-orange-600 to-amber-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-4xl font-bold mb-6">Bạn là chủ nhà hàng?</h3>
              <p className="text-xl text-orange-100 mb-8 leading-relaxed">
                Gia nhập nền tảng của chúng tôi để tiếp cận hàng nghìn khách hàng mới.
                Quản lý đặt bàn dễ dàng, tăng doanh thu và phát triển thương hiệu của bạn.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start space-x-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Tiếp cận khách hàng rộng</h4>
                    <p className="text-orange-100">Hàng nghìn người dùng tìm kiếm nhà hàng mỗi ngày</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Quản lý thông minh</h4>
                    <p className="text-orange-100">Hệ thống đặt bàn tự động, tiết kiệm thời gian</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Xây dựng thương hiệu</h4>
                    <p className="text-orange-100">Đánh giá và phản hồi từ khách hàng thực tế</p>
                  </div>
                </div>
              </div>

              <a
                href="/partner"
                className="inline-block bg-white text-orange-600 px-8 py-4 rounded-xl hover:bg-gray-50 transition font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                Đăng ký hợp tác ngay
              </a>
            </div>

            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                <img
                  src="https://images.pexels.com/photos/3184192/pexels-photo-3184192.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Restaurant owner"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Utensils className="w-6 h-6 text-orange-500" />
                <h4 className="text-xl font-bold">TableBooking</h4>
              </div>
              <p className="text-gray-400">
                Nền tảng đặt bàn nhà hàng hàng đầu Việt Nam
              </p>
            </div>

            <div>
              <h5 className="font-semibold mb-4">Về chúng tôi</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-orange-500 transition">Giới thiệu</a></li>
                <li><a href="#" className="hover:text-orange-500 transition">Nghề nghiệp</a></li>
                <li><a href="#" className="hover:text-orange-500 transition">Liên hệ</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold mb-4">Dành cho đối tác</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/partner" className="hover:text-orange-500 transition">Đăng ký hợp tác</a></li>
                <li><a href="#" className="hover:text-orange-500 transition">Hướng dẫn</a></li>
                <li><a href="#" className="hover:text-orange-500 transition">Chính sách</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold mb-4">Hỗ trợ</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-orange-500 transition">Trung tâm trợ giúp</a></li>
                <li><a href="#" className="hover:text-orange-500 transition">Điều khoản</a></li>
                <li><a href="#" className="hover:text-orange-500 transition">Bảo mật</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 TableBooking. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
