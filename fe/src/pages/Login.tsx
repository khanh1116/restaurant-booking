// src/pages/Login.tsx
import { useState } from "react";
import { X, Mail, Lock, AlertCircle } from "lucide-react";
import { onLogin as apiLogin } from "../lib/api";


interface LoginProps {
  onClose: () => void;
  onSwitchToRegister: () => void;
  onLogin?: (
    phone_number: string,
    password: string
  ) => Promise<{ error?: string }>;
}



export function Login({ onClose, onSwitchToRegister, onLogin }: LoginProps) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loginFn = onLogin ?? apiLogin;
      const { error } = await loginFn(phone, password);
      if (error) {
        setError(
          error === "Invalid login credentials"
            ? "Số điện thoại hoặc mật khẩu không đúng"
            : error
        );
        return;
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError("Có lỗi khi đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Đăng Nhập</h2>
          <p className="text-gray-600">Chào mừng bạn quay trở lại!</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số điện thoại
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                inputMode="tel"
                pattern="^(\+?\d{7,15}|0\d{9,11})$"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                placeholder="VD: 0912345678 hoặc +84912345678"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mật Khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Đang xử lý..." : "Đăng Nhập"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Chưa có tài khoản?{" "}
            <button
              onClick={onSwitchToRegister}
              className="text-amber-600 font-semibold hover:text-orange-600 transition-colors"
            >
              Đăng ký ngay
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
