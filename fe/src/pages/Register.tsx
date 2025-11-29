// src/pages/Register.tsx
import { useState } from "react";
import { Mail, Lock, User, Phone, Utensils } from "lucide-react";
import { onRegister } from "../lib/api";

export function Register() {
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    const fd = new FormData(form);
    const full_name = String(fd.get("fullname") || "").trim();
    const emailRaw = String(fd.get("email") || "").trim();
    const phone_number = String(fd.get("phone") || "").trim();
    const password = String(fd.get("password") || "").trim();
    const confirmPassword = String(fd.get("confirmPassword") || "").trim();
    const terms = !!fd.get("terms");

    if (!full_name) return alert("Vui lòng nhập họ và tên");
    if (!phone_number) return alert("Nhập số điện thoại");
    if (password.length < 6)
      return alert("Mật khẩu tối thiểu 6 ký tự (theo yêu cầu hệ thống)");
    if (password !== confirmPassword)
      return alert("Mật khẩu nhập lại không khớp");
    if (!terms)
      return alert("Bạn phải đồng ý Điều khoản và Chính sách trước khi tiếp tục");

    const payload: Parameters<typeof onRegister>[0] = {
      full_name,
      phone_number,
      password,
      ...(emailRaw ? { email: emailRaw.toLowerCase() } : {}),
    };

    try {
      setSubmitting(true);
      const res = await onRegister(payload);
      if (res.error) return alert(res.error);
      alert("Đăng ký thành công!");
      form.reset();
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi đăng ký. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="bg-orange-600 p-3 rounded-2xl shadow-md">
              <Utensils className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tạo tài khoản</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            noValidate
            onSubmit={handleSubmit}
          >
            <div>
              <label
                htmlFor="fullname"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Họ và tên <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="fullname"
                  name="fullname"
                  type="text"
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email (không bắt buộc)
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="example@email.com"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Mật khẩu <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••"
                  minLength={6}
                  required
                  aria-describedby="pw-help"
                  className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showPw ? "Ẩn" : "Hiện"}
                </button>
              </div>
              <p id="pw-help" className="text-xs text-gray-500 mt-1">
                Tối thiểu 6 ký tự
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Xác nhận mật khẩu <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showPw2 ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••"
                  minLength={6}
                  required
                  className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw2((v) => !v)}
                  aria-label={showPw2 ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showPw2 ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Số điện thoại <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0912345678"
                  pattern="^(\+?\d{7,15}|0\d{9,11})$"
                  required
                  aria-describedby="phone-help"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition"
                />
              </div>
              <p id="phone-help" className="text-xs text-gray-500 mt-1">
                VD: 0912345678 hoặc +84912345678
              </p>
            </div>

            <div className="flex items-start bg-amber-50 border border-amber-200 rounded-xl p-3">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
                Tôi đồng ý với{" "}
                <a
                  href="#"
                  className="text-orange-600 hover:text-orange-700 font-medium underline underline-offset-2"
                >
                  Điều khoản sử dụng
                </a>{" "}
                và{" "}
                <a
                  href="#"
                  className="text-orange-600 hover:text-orange-700 font-medium underline underline-offset-2"
                >
                  Chính sách bảo mật
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className={`md:col-span-2 w-full text-white py-3 rounded-xl font-semibold shadow-lg transition
                ${
                  submitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-orange-600 hover:bg-orange-700 hover:shadow-xl hover:scale-[1.02]"
                }`}
            >
              {submitting ? "Đang đăng ký..." : "Đăng ký"}
            </button>
          </form>

          {/* SSO giữ nguyên */}
          <div className="mt-5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">
                  Hoặc đăng ký với
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* Google & Facebook button giữ nguyên như cũ */}
              {/* ... */}
            </div>
          </div>
        </div>

        <p className="text-center mt-5 text-gray-600 text-sm">
          Đã có tài khoản?{" "}
          <a
            href="/login"
            className="text-orange-600 hover:text-orange-700 font-semibold"
          >
            Đăng nhập ngay
          </a>
        </p>
      </div>
    </div>
  );
}
