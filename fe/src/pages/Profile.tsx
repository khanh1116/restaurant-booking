// src/pages/Profile.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Utensils,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

interface UserInfo {
  id: number;
  phone_number: string;
  email?: string | null;
  full_name?: string | null;
  role: "CUSTOMER" | "PARTNER" | "ADMIN" | string;
  created_at: string;
}

interface CustomerInfo {
  phone_number: string;
  email: string;
  full_name: string;
  date_of_birth?: string | null;
  address?: string | null;
  loyalty_points: number;
  total_bookings: number;
}

interface PartnerInfo {
  phone_number: string;
  email: string;
  full_name: string;
  business_name: string;
  business_license?: string | null;
  tax_code?: string | null;
  status: string;
}

interface ProfileResponse {
  user: UserInfo;
  customer?: CustomerInfo;
  partner?: PartnerInfo;
}

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const access = localStorage.getItem("access");
    if (!access) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/accounts/profile/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
        });

        if (res.status === 401) {
          // token hết hạn hoặc không hợp lệ
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        const data = (await res.json()) as ProfileResponse;

        if (!res.ok) {
          throw new Error(
            (data as any)?.detail || (data as any)?.error || "Không lấy được thông tin hồ sơ"
          );
        }

        setProfile(data);
        // Cập nhật lại localStorage user cho header (nếu muốn)
        localStorage.setItem("user", JSON.stringify(data.user));
      } catch (err: any) {
        console.error("Profile error:", err);
        setError(err.message || "Có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const user = profile?.user;
  const customer = profile?.customer;
  const partner = profile?.partner;

  const roleLabel =
    user?.role === "CUSTOMER"
      ? "Khách hàng"
      : user?.role === "PARTNER"
      ? "Đối tác nhà hàng"
      : user?.role === "ADMIN"
      ? "Quản trị viên"
      : user?.role || "Người dùng";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header đơn giản */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Utensils className="w-7 h-7 text-amber-600" />
            <button
              onClick={() => navigate("/")}
              className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"
            >
              TableBooking
            </button>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-600 hover:text-amber-600"
          >
            ← Quay lại
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
          <UserIcon className="w-7 h-7 text-amber-600" />
          <span>Trang cá nhân</span>
        </h1>

        {loading && (
          <div className="bg-white rounded-2xl shadow-md p-6 text-center text-gray-600">
            Đang tải thông tin...
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-4">
            {error}
          </div>
        )}

        {!loading && !error && user && (
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
            {/* Thông tin chính */}
            <div className="flex items-center space-x-4 border-b border-slate-100 pb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
                {(user.full_name || user.phone_number || "?")
                  .toString()
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {user.full_name || user.phone_number}
                </h2>
                <p className="text-sm text-gray-600">{roleLabel}</p>
              </div>
            </div>

            {/* Liên hệ */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 mb-2">
                Thông tin liên hệ
              </h3>
              <div className="flex items-center space-x-3 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{user.phone_number}</span>
              </div>
              {user.email && (
                <div className="flex items-center space-x-3 text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{user.email}</span>
                </div>
              )}
              {customer?.address && (
                <div className="flex items-center space-x-3 text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{customer.address}</span>
                </div>
              )}
            </div>

            {/* Thông tin khách hàng */}
            {customer && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="font-semibold text-gray-800 mb-2">
                  Thông tin khách hàng
                </h3>
                {customer.date_of_birth && (
                  <div className="flex items-center space-x-3 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Ngày sinh: {customer.date_of_birth}</span>
                  </div>
                )}
                <div className="flex items-center space-x-3 text-gray-700">
                  <span>
                    Điểm tích lũy:{" "}
                    <b>{customer.loyalty_points ?? 0}</b>
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-gray-700">
                  <span>
                    Số lần đặt bàn:{" "}
                    <b>{customer.total_bookings ?? 0}</b>
                  </span>
                </div>
              </div>
            )}

            {/* Thông tin đối tác */}
            {partner && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="font-semibold text-gray-800 mb-2">
                  Thông tin nhà hàng
                </h3>
                <div className="flex items-center space-x-3 text-gray-700">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>{partner.business_name}</span>
                </div>
                {partner.business_license && (
                  <div className="flex items-center space-x-3 text-gray-700">
                    <span>GPKD: {partner.business_license}</span>
                  </div>
                )}
                {partner.tax_code && (
                  <div className="flex items-center space-x-3 text-gray-700">
                    <span>Mã số thuế: {partner.tax_code}</span>
                  </div>
                )}
                <div className="flex items-center space-x-3 text-gray-700">
                  <span>Trạng thái: {partner.status}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
