import { useState, useEffect } from "react";
import { X, Calendar, Clock, Users, MessageSquare, Check, AlertCircle, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

type Restaurant = {
  id: number;
  name: string;
  address: string;
  phone_number?: string;
};

type TimeSlot = {
  id: number;
  start_time: string;
  end_time: string;
  max_bookings: number | null;
  is_active: boolean;
};

type AvailableSlot = TimeSlot & {
  current_bookings?: number;
  available?: boolean;
};

type Props = {
  restaurant: Restaurant;
  initialDate?: string;
  initialGuests?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function BookingForm({
  restaurant,
  initialDate = "",
  initialGuests = "2",
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form data
  const [bookingDate, setBookingDate] = useState(initialDate);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [numberOfGuests, setNumberOfGuests] = useState(initialGuests);
  const [specialRequest, setSpecialRequest] = useState("");

  // Available slots
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (bookingDate) {
      fetchAvailableSlots();
    }
  }, [bookingDate]);

  const getAuthHeaders = () => {
    const access = localStorage.getItem("access");
    return {
      "Content-Type": "application/json",
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    };
  };

  const fetchAvailableSlots = async () => {
    if (!bookingDate) return;

    setSlotsLoading(true);
    setError("");
    setSelectedSlot(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/restaurants/restaurants/${restaurant.id}/available-slots/?date=${bookingDate}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok) throw new Error("Không thể tải khung giờ");

      const data = await res.json();
      setAvailableSlots(data.available_slots || []);
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải khung giờ");
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSlot) {
      setError("Vui lòng chọn khung giờ");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        restaurant: restaurant.id,
        time_slot: selectedSlot.id,
        booking_date: bookingDate,
        number_of_guests: parseInt(numberOfGuests),
        special_request: specialRequest || undefined,
      };

      const res = await fetch(`${API_BASE}/api/bookings/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.detail || "Đặt bàn thất bại");
      }

      // Success
      setStep(4);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Đặt bàn thất bại");
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // "HH:MM:SS" -> "HH:MM"
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Đặt Bàn</h2>
            <p className="text-gray-600 mt-1">{restaurant.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s
                      ? "bg-amber-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step > s ? "bg-amber-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between max-w-md mx-auto mt-2 text-sm">
            <span className={step >= 1 ? "text-amber-600 font-medium" : "text-gray-500"}>
              Chọn ngày
            </span>
            <span className={step >= 2 ? "text-amber-600 font-medium" : "text-gray-500"}>
              Chọn giờ
            </span>
            <span className={step >= 3 ? "text-amber-600 font-medium" : "text-gray-500"}>
              Xác nhận
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Chọn ngày */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Chọn ngày đặt bàn
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={getMinDate()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>

              <button
                onClick={() => {
                  if (!bookingDate) {
                    setError("Vui lòng chọn ngày");
                    return;
                  }
                  setStep(2);
                }}
                disabled={!bookingDate || slotsLoading}
                className="w-full bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {slotsLoading ? "Đang tải..." : "Tiếp theo"}
              </button>
            </div>
          )}

          {/* Step 2: Chọn giờ */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Chọn khung giờ
                </label>

                {slotsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
                    <p className="text-gray-600 mt-2">Đang tải khung giờ...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">
                      Không có khung giờ nào khả dụng cho ngày này
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-4 border-2 rounded-xl text-center transition ${
                          selectedSlot?.id === slot.id
                            ? "border-amber-600 bg-amber-50 text-amber-700"
                            : "border-gray-200 hover:border-amber-300 text-gray-700"
                        }`}
                      >
                        <div className="font-semibold">
                          {formatTime(slot.start_time)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          đến {formatTime(slot.end_time)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => {
                    if (!selectedSlot) {
                      setError("Vui lòng chọn khung giờ");
                      return;
                    }
                    setStep(3);
                  }}
                  disabled={!selectedSlot}
                  className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Tiếp theo
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Xác nhận */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Số lượng khách
                </label>
                <select
                  value={numberOfGuests}
                  onChange={(e) => setNumberOfGuests(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      {num} người
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Yêu cầu đặc biệt (không bắt buộc)
                </label>
                <textarea
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  placeholder="Vị trí ngồi, dị ứng thực phẩm, kỷ niệm đặc biệt..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <h4 className="font-semibold text-gray-800">Thông tin đặt bàn</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>📍 {restaurant.name}</p>
                  <p>📅 {new Date(bookingDate).toLocaleDateString("vi-VN")}</p>
                  <p>
                    🕐 {formatTime(selectedSlot!.start_time)} - {formatTime(selectedSlot!.end_time)}
                  </p>
                  <p>👥 {numberOfGuests} người</p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
                  disabled={loading}
                >
                  Quay lại
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <span>Xác nhận đặt bàn</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Đặt bàn thành công!
              </h3>
              <p className="text-gray-600 mb-6">
                Chúng tôi đã gửi thông tin đặt bàn đến email của bạn.
                <br />
                Nhà hàng sẽ xác nhận trong thời gian sớm nhất.
              </p>
              <button
                onClick={onClose}
                className="bg-amber-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-amber-700 transition"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}