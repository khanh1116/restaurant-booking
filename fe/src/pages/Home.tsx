import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Clock,
  Users,
  Star,
  ChefHat,
  Utensils,
  Wine,
  Calendar,
  User,
  LogOut,
  UserCircle2,
  Briefcase,
  CalendarCheck,
  ShieldCheck,
} from "lucide-react";
import { buildImageUrl, PLACEHOLDER_IMAGE } from "@/lib/imageUtils";
import BookingForm from "@/components/bookings/BookingForm";
import NotificationBell from "@/components/notifications/NotificationBell";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

// Bỏ dấu "/" dư ở cuối nếu có, rồi thêm /admin/
const ADMIN_URL = `${API_BASE.replace(/\/+$/, "")}/admin/`;


type Restaurant = {
  id: number;
  name: string;
  address: string;
  description?: string;
  rating: number;
  status: string;
  location?: {
    id: number;
    city: string;
    district?: string;
    ward?: string;
  };
  image_count?: number;
  images?: { id: number; image_url: string; display_order: number }[];
};

type Location = {
  id: number;
  city: string;
  district?: string;
  ward?: string;
  full_address?: string;
};

export default function Home() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [guests, setGuests] = useState("2");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    const access = localStorage.getItem("access");
    setIsLoggedIn(!!access);

    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {
        setCurrentUser(null);
      }
    }

    fetchLocations();
    fetchRestaurants();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/locations/`);
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  };

const fetchRestaurants = async () => {
  setLoading(true);
  setError("");
  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedLocation) params.append("location", selectedLocation);

    const url = `${API_BASE}/api/restaurants/restaurants/${
      params.toString() ? "?" + params.toString() : ""
    }`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      
      // 🔥 THÊM ĐOẠN NÀY: Fetch images cho từng restaurant
      const restaurantsWithImages = await Promise.all(
        data.map(async (restaurant: Restaurant) => {
          try {
            // Fetch images của từng nhà hàng
            const imagesRes = await fetch(
              `${API_BASE}/api/restaurants/images/?restaurant_id=${restaurant.id}`
            );
            if (imagesRes.ok) {
              const images = await imagesRes.json();
              return { ...restaurant, images };
            }
          } catch (err) {
            console.error(`Failed to fetch images for restaurant ${restaurant.id}:`, err);
          }
          return restaurant;
        })
      );
      
      setRestaurants(restaurantsWithImages);
    } else {
      setError("Không thể tải danh sách nhà hàng");
    }
  } catch (err) {
    setError("Lỗi kết nối server");
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRestaurants();
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setAccountMenuOpen(false);
    try {
      const refresh = localStorage.getItem("refresh");
      const access = localStorage.getItem("access");

      if (refresh) {
        try {
          await fetch(`${API_BASE}/api/accounts/logout/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(access ? { Authorization: `Bearer ${access}` } : {}),
            },
            body: JSON.stringify({ refresh }),
          });
        } catch (err) {
          console.error("Logout request error:", err);
        }
      }
    } finally {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("user");
      setIsLoggedIn(false);
      setCurrentUser(null);
      setLogoutLoading(false);
      navigate("/");
    }
  };

  const handleBookTable = (restaurant: Restaurant) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (currentUser?.role !== "CUSTOMER") {
      alert("Chỉ khách hàng mới có thể đặt bàn");
      return;
    }
    setSelectedRestaurant(restaurant);
    setBookingFormOpen(true);
  };

  const cuisineTypes = [
    { name: "Món Việt", icon: <ChefHat className="w-6 h-6" /> },
    { name: "Nhật Bản", icon: <Utensils className="w-6 h-6" /> },
    { name: "Ý", icon: <Wine className="w-6 h-6" /> },
    { name: "Hải Sản", icon: <Utensils className="w-6 h-6" /> },
    { name: "BBQ", icon: <ChefHat className="w-6 h-6" /> },
    { name: "Fine Dining", icon: <Wine className="w-6 h-6" /> },
  ];

  const displayName =
    currentUser?.full_name ||
    currentUser?.phone_number ||
    currentUser?.email ||
    "Tài khoản";

  const getRoleButton = () => {
    if (!isLoggedIn) {
      return (
        <Link
          to="/register_partner"
          className="text-orange-600 hover:text-orange-700 font-semibold transition"
        >
          Đối tác
        </Link>
      );
    }

    switch (currentUser?.role) {
      case "PARTNER":
        return (
          <Link
            to="/partner"
            className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-semibold transition"
          >
            <Briefcase className="w-5 h-5" />
            <span>Quản lý nhà hàng</span>
          </Link>
        );
      case "CUSTOMER":
        return (
          <Link
            to="/my-bookings"
            className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-semibold transition"
          >
            <CalendarCheck className="w-5 h-5" />
            <span>Đặt bàn của tôi</span>
          </Link>
        );
      case "ADMIN":
        return (
          <a
            href={ADMIN_URL}
            className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-semibold transition"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Admin Panel</span>
          </a>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Utensils className="w-8 h-8 text-amber-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                TableBooking
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#"
                className="text-gray-700 hover:text-amber-600 transition-colors font-medium"
              >
                Khám Phá
              </a>
              <a
                href="#"
                className="text-gray-700 hover:text-amber-600 transition-colors font-medium"
              >
                Ưu Đãi
              </a>

              {getRoleButton()}

              {/* 🔥 THÊM NOTIFICATION BELL Ở ĐÂY (TRƯỚC USER MENU) */}
              {isLoggedIn && <NotificationBell position="right" />}

              {isLoggedIn ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-gray-800 px-4 py-2 rounded-full font-medium transition-all duration-200"
                  >
                    <UserCircle2 className="w-5 h-5 text-amber-600" />
                    <span className="max-w-[140px] truncate">
                      {displayName}
                    </span>
                  </button>

                  {accountMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2 text-sm z-50">
                      <button
                        onClick={() => {
                          setAccountMenuOpen(false);
                          navigate("/profile");
                        }}
                        className="w-full px-4 py-2 flex items-center space-x-2 hover:bg-slate-50 text-left"
                      >
                        <User className="w-4 h-4 text-amber-600" />
                        <span>Trang cá nhân</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        disabled={logoutLoading}
                        className="w-full px-4 py-2 flex items-center space-x-2 hover:bg-slate-50 text-left text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>
                          {logoutLoading ? "Đang đăng xuất..." : "Đăng xuất"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all duration-300 font-medium"
                >
                  Đăng Nhập
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative h-[600px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.pexels.com/photos/3201921/pexels-photo-3201921.jpeg?auto=compress&cs=tinysrgb&w=1600)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Đặt Bàn Dễ Dàng,
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Ăn Ngon Trọn Vẹn
              </span>
            </h1>
            <p className="text-xl mb-8 text-gray-200 leading-relaxed">
              Khám phá hàng nghìn nhà hàng tuyệt vời và đặt bàn chỉ trong vài
              giây. Trải nghiệm ẩm thực chưa bao giờ dễ dàng đến thế!
            </p>

            {/* Search Box */}
            <div onSubmit={handleSearch} className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Tìm nhà hàng, món ăn..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-gray-800 transition-all"
                  />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-gray-800 transition-all appearance-none"
                  >
                    <option value="">Tất cả khu vực</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.city}
                        {loc.district ? `, ${loc.district}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-gray-800 transition-all"
                  />
                </div>

                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-gray-800 transition-all"
                  />
                </div>

                <div className="relative">
                  <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-gray-800 transition-all appearance-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} người
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSearch}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
              >
                Tìm Kiếm Nhà Hàng
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Cuisine Types */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">
          Khám Phá Theo Ẩm Thực
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cuisineTypes.map((cuisine, index) => (
            <button
              key={index}
              className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="text-amber-600 group-hover:text-orange-600 transition-colors">
                  {cuisine.icon}
                </div>
                <span className="font-semibold text-gray-700 group-hover:text-amber-600 transition-colors">
                  {cuisine.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Restaurants List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Nhà Hàng Nổi Bật</h2>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            <p className="mt-4 text-gray-600">Đang tải nhà hàng...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && restaurants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Không tìm thấy nhà hàng phù hợp
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {restaurants.map((restaurant) => {
            const imageUrl =
              restaurant.images && restaurant.images.length > 0
                ? buildImageUrl(restaurant.images[0].image_url)
                : PLACEHOLDER_IMAGE;

            return (
              <div
                key={restaurant.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] overflow-hidden group cursor-pointer"
              >
                {/* 🔥 Wrap ảnh và tên trong Link */}
                <Link to={`/restaurant/${restaurant.id}`}>
                
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                    }}
                  />
                  {restaurant.status === "APPROVED" && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Còn Chỗ
                    </div>
                  )}
                </div> </Link>

                <div className="p-5">
                  {/* 🔥 tên nhà hàng Link */}
                  <Link to={`/restaurant/${restaurant.id}`}>
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-amber-600 transition-colors">
                    {restaurant.name}
                  </h3>
                  </Link>

                  <div className="flex items-center space-x-2 mb-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 text-sm truncate">
                      {restaurant.address}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      <span className="font-bold text-gray-800">
                        {Number(restaurant.rating ?? 0).toFixed(1)}                      </span>
                    </div>

                    <button
                      onClick={() => handleBookTable(restaurant)}
                      className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
                    >
                      Đặt Bàn
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Partner CTA */}
      <section className="py-20 bg-gradient-to-br from-orange-600 to-amber-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-4xl font-bold mb-6">Bạn là chủ nhà hàng?</h3>
              <p className="text-xl text-orange-100 mb-8 leading-relaxed">
                Gia nhập nền tảng của chúng tôi để tiếp cận hàng nghìn khách
                hàng mới. Quản lý đặt bàn dễ dàng, tăng doanh thu và phát triển
                thương hiệu của bạn.
              </p>

              <a
                href="/register_partner"
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

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p>&copy; 2025 TableBooking. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </footer>

      {/* Booking Form Modal - TODO: Implement */}
      {/* {bookingFormOpen && selectedRestaurant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
            <h3 className="text-2xl font-bold mb-4">
              Đặt bàn tại {selectedRestaurant.name}
            </h3>
            <p className="text-gray-600 mb-4">
              Booking form sẽ được implement ở component riêng
            </p>
            <button
              onClick={() => setBookingFormOpen(false)}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg"
            >
              Đóng
            </button>
          </div>
        </div>
      )} */}

      {bookingFormOpen && selectedRestaurant && (
      <BookingForm
        restaurant={selectedRestaurant}
        initialDate={selectedDate}
        initialGuests={guests}
        onClose={() => setBookingFormOpen(false)}
        onSuccess={() => {
          // Optional: redirect hoặc show notification
          navigate("/my-bookings"); // Chuyển đến trang "booking của tôi"
        }}
      />
    )}
      

    </div>
  );
}