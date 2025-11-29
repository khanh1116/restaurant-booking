// src/pages/RegisterPartner.tsx
import { useState } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Utensils,
  CheckCircle2,
  Lock,
  FileText,
  DollarSign,
} from "lucide-react";
import { onRegisterPartner } from "../lib/api";

export default function Partner() {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const business_name = String(fd.get("restaurant-name") || "").trim();
    const phone_number = String(fd.get("phone") || "").trim();
    const emailRaw = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "").trim();
    const confirmPassword = String(fd.get("confirmPassword") || "").trim();
    const full_name = String(fd.get("contact-name") || "").trim();
    const business_license = String(fd.get("business-license") || "").trim();
    const tax_code = String(fd.get("tax-code") || "").trim();
    const terms = !!fd.get("terms");

    if (!business_name) return alert("Vui lòng nhập Tên nhà hàng");
    if (!full_name) return alert("Vui lòng nhập Họ tên người đại diện");
    if (!phone_number) return alert("Vui lòng nhập Số điện thoại");
    if (password.length < 6)
      return alert("Mật khẩu tối thiểu 6 ký tự (theo yêu cầu hệ thống)");
    if (password !== confirmPassword)
      return alert("Mật khẩu nhập lại không khớp");
    if (!terms) return alert("Bạn cần đồng ý Điều khoản hợp tác");

    const payload: Parameters<typeof onRegisterPartner>[0] = {
      business_name,
      phone_number,
      password,
      full_name,
      ...(emailRaw ? { email: emailRaw.toLowerCase() } : {}),
      ...(business_license ? { business_license } : {}),
      ...(tax_code ? { tax_code } : {}),
    };

    try {
      setSubmitting(true);
      const res = await onRegisterPartner(payload);
      if (res.error) return alert(res.error);
      alert("Gửi đăng ký thành công! Vui lòng chờ xét duyệt.");
      form.reset();
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi gửi đăng ký. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

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
            <div className="flex items-center space-x-4">
              <a
                href="/"
                className="text-gray-700 hover:text-orange-600 font-medium transition"
              >
                ← Quay về trang chủ
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="relative bg-gradient-to-r from-orange-600 to-amber-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Đăng ký hợp tác nhà hàng
          </h2>
          <p className="text-xl text-orange-100 max-w-2xl mx-auto">
            Gia nhập nền tảng đặt bàn và phát triển doanh nghiệp của bạn
          </p>
        </div>
      </section>

      <section className="py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Lợi ích khi tham gia
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-800">
                    Tăng khách hàng
                  </h4>
                  <p className="text-sm text-gray-600">
                    Tiếp cận hàng nghìn khách hàng tiềm năng
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-800">
                    Quản lý dễ dàng
                  </h4>
                  <p className="text-sm text-gray-600">
                    Hệ thống quản lý đặt bàn thông minh
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-800">
                    Hỗ trợ 24/7
                  </h4>
                  <p className="text-sm text-gray-600">
                    Đội ngũ hỗ trợ nhiệt tình, chuyên nghiệp
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="border-b border-gray-200 pb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Thông tin nhà hàng
              </h4>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="restaurant-name"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Tên nhà hàng <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="restaurant-name"
                      name="restaurant-name"
                      type="text"
                      placeholder="Nhà hàng của bạn"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="cuisine-type"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Loại ẩm thực <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="cuisine-type"
                    name="cuisine-type"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                    required
                  >
                    <option value="">Chọn loại ẩm thực</option>
                    <option value="vietnamese">Việt Nam</option>
                    <option value="japanese">Nhật Bản</option>
                    <option value="korean">Hàn Quốc</option>
                    <option value="italian">Ý</option>
                    <option value="chinese">Trung Hoa</option>
                    <option value="thai">Thái Lan</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="address"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Địa chỉ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                    required
                  ></textarea>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      pattern="^(\+?\d{7,15}|0\d{9,11})$"
                      placeholder="0912345678"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Email (không bắt buộc)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="restaurant@email.com"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Business license + tax code */}
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label
                    htmlFor="business-license"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Giấy phép kinh doanh
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="business-license"
                      name="business-license"
                      type="text"
                      placeholder="Số GPKD (nếu có)"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="tax-code"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Mã số thuế
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="tax-code"
                      name="tax-code"
                      type="text"
                      placeholder="Mã số thuế (nếu có)"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Thông tin người đại diện
              </h4>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Họ tên người đại diện{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-name"
                    name="contact-name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-position"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Chức vụ
                  </label>
                  <input
                    id="contact-position"
                    name="contact-position"
                    type="text"
                    placeholder="Chủ nhà hàng / Quản lý"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      minLength={6}
                      placeholder="••••••"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Xác nhận mật khẩu{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      minLength={6}
                      placeholder="••••••"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start pt-4">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="w-4 h-4 mt-1 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                required
              />
              <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
                Tôi đã đọc và đồng ý với{" "}
                <a
                  href="#"                className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Điều khoản hợp tác
                </a>{" "}
                và{" "}
                <a
                  href="#"
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Chính sách đối tác
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-600 text-white py-4 rounded-xl hover:bg-orange-700 transition font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-60"
            >
              {submitting ? "Đang gửi..." : "Gửi đăng ký hợp tác"}
            </button>
          </form>
        </div>

        <div className="mt-8 bg-orange-50 rounded-2xl p-6 border border-orange-200">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-orange-600" />
            Quy trình xét duyệt
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            Sau khi nhận được đăng ký, đội ngũ của chúng tôi sẽ liên hệ với bạn
            trong vòng 24–48 giờ để xác nhận thông tin và hướng dẫn các bước
            tiếp theo. Thời gian xét duyệt thông thường từ 3–5 ngày làm việc.
          </p>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            Cần hỗ trợ? Liên hệ:{" "}
            <a
              href="tel:1900xxx"
              className="text-orange-500 hover:text-orange-400"
            >
              1900 xxx
            </a>{" "}
            hoặc{" "}
            <a
              href="mailto:partner@tablebooking.vn"
              className="text-orange-500 hover:text-orange-400"
            >
              partner@tablebooking.vn
            </a>
          </p>
          <p className="text-gray-500 mt-4">
            &copy; 2025 TableBooking. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
