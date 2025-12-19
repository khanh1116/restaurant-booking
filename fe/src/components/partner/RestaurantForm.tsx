// RestaurantForm.tsx
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import {
  createRestaurant,
  updateRestaurant,
  fetchRestaurant,
  createLocation,
} from "@/lib/api";

import * as vn from "vietnam-provinces";
import type { Province, District, Ward } from "vietnam-provinces";

interface RestaurantFormProps {
  restaurantId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type MainFormState = {
  name: string;
  description: string;
  address: string; // chỉ cần "số nhà + tên đường"
  phone_number: string;
  opening_time: string;
  closing_time: string;
  slot_duration: number;
};

type LocationFormState = {
  city: string;
  district: string;
  ward: string;
  location_id?: number;
};

function norm(s?: string) {
  return (s || "").trim().toLowerCase();
}

export default function RestaurantForm({
  restaurantId,
  onSuccess,
  onCancel,
}: RestaurantFormProps) {
  const [formData, setFormData] = useState<MainFormState>({
    name: "",
    description: "",
    address: "",
    phone_number: "",
    opening_time: "",
    closing_time: "",
    slot_duration: 120,
  });

  const [locationData, setLocationData] = useState<LocationFormState>({
    city: "",
    district: "",
    ward: "",
    location_id: undefined,
  });

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState("");
  const [selectedWardCode, setSelectedWardCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!restaurantId);
  const [error, setError] = useState("");

  const provincesReady = useMemo(() => provinces.length > 0, [provinces.length]);

  // ===== helper text cho địa chỉ hành chính =====
  const areaText = useMemo(() => {
    // Hiển thị kiểu: Phường ..., Thành phố ..., Tỉnh ...
    return [locationData.ward, locationData.district, locationData.city]
      .filter(Boolean)
      .join(", ");
  }, [locationData.ward, locationData.district, locationData.city]);

  const addressPlaceholder = useMemo(() => {
    // placeholder chỉ cần số nhà + đường
    // ví dụ: "Số 12 Lê Lợi" + (areaText)
    return areaText
      ? `Chỉ cần nhập số nhà + tên đường (VD: 12 Lê Lợi). Hệ thống tự ghép: ${areaText}`
      : "Chỉ cần nhập số nhà + tên đường (VD: 12 Lê Lợi)";
  }, [areaText]);

  // ===== 1) Load provinces list =====
  useEffect(() => {
    try {
      if (typeof (vn as any).getProvinces !== "function") {
        throw new Error("vietnam-provinces: thiếu getProvinces()");
      }
      const data = (vn as any).getProvinces() as Province[];
      if (!Array.isArray(data)) throw new Error("getProvinces() không trả về array");

      const sorted = [...data].sort((a, b) =>
        String((a as any).name).localeCompare(String((b as any).name), "vi")
      );
      setProvinces(sorted);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Không thể tải dữ liệu tỉnh/thành");
    }
  }, []);

  // ===== 2) Load restaurant (edit) =====
  useEffect(() => {
    if (!restaurantId) {
      setInitialLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await fetchRestaurant(restaurantId);

        let opening_time = "";
        let closing_time = "";
        if (data?.opening_hours) {
          const parts = String(data.opening_hours).split("-").map((s) => s.trim());
          opening_time = parts[0] || "";
          closing_time = parts[1] || "";
        }

        setFormData({
          name: data?.name || "",
          description: data?.description || "",
          // ❗ hiện tại backend lưu full address hay chỉ street tùy bạn.
          // Nếu đang lưu full, user sẽ thấy nguyên chuỗi.
          // Bạn có thể tự tách sau nếu muốn (mình có thể viết thêm).
          address: data?.address || "",
          phone_number: data?.phone_number || "",
          opening_time,
          closing_time,
          slot_duration: data?.slot_duration || 120,
        });

        setLocationData({
          city: data?.location?.city || "",
          district: data?.location?.district || "",
          ward: data?.location?.ward || "",
          location_id: data?.location?.id,
        });
      } catch (e: any) {
        setError(e?.message || "Không thể tải dữ liệu nhà hàng");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [restaurantId]);

  // ===== 3) Sync dropdown theo name (khi edit) =====
  useEffect(() => {
    if (!restaurantId) return;
    if (!provincesReady) return;
    if (!locationData.city) return;

    const p = provinces.find((x) => norm(String((x as any).name)) === norm(locationData.city));
    if (!p) return;

    const pCode = String((p as any).code);
    setSelectedProvinceCode(pCode);

    const dList =
      typeof (vn as any).getDistricts === "function"
        ? ((vn as any).getDistricts(pCode) as District[])
        : [];
    setDistricts(Array.isArray(dList) ? dList : []);

    const d = dList.find((x) => norm(String((x as any).name)) === norm(locationData.district));
    if (!d) {
      setSelectedDistrictCode("");
      setWards([]);
      setSelectedWardCode("");
      return;
    }

    const dCode = String((d as any).code);
    setSelectedDistrictCode(dCode);

    const wList =
      typeof (vn as any).getWards === "function"
        ? ((vn as any).getWards(dCode) as Ward[])
        : [];
    setWards(Array.isArray(wList) ? wList : []);

    const w = wList.find((x) => norm(String((x as any).name)) === norm(locationData.ward));
    setSelectedWardCode(w ? String((w as any).code) : "");
  }, [
    restaurantId,
    provincesReady,
    provinces,
    locationData.city,
    locationData.district,
    locationData.ward,
  ]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "slot_duration") {
      setFormData((prev) => ({ ...prev, slot_duration: Number(value) || 0 }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceCode = e.target.value;

    setSelectedProvinceCode(provinceCode);
    setSelectedDistrictCode("");
    setSelectedWardCode("");
    setWards([]);

    const p = provinces.find((x) => String((x as any).code) === String(provinceCode));
    setLocationData((prev) => ({
      ...prev,
      city: p ? String((p as any).name) : "",
      district: "",
      ward: "",
      location_id: undefined,
    }));

    const dList =
      typeof (vn as any).getDistricts === "function"
        ? ((vn as any).getDistricts(provinceCode) as District[])
        : [];
    setDistricts(Array.isArray(dList) ? dList : []);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const districtCode = e.target.value;

    setSelectedDistrictCode(districtCode);
    setSelectedWardCode("");

    const d = districts.find((x) => String((x as any).code) === String(districtCode));
    setLocationData((prev) => ({
      ...prev,
      district: d ? String((d as any).name) : "",
      ward: "",
      location_id: undefined,
    }));

    const wList =
      typeof (vn as any).getWards === "function"
        ? ((vn as any).getWards(districtCode) as Ward[])
        : [];
    setWards(Array.isArray(wList) ? wList : []);
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wardCode = e.target.value;

    setSelectedWardCode(wardCode);

    const w = wards.find((x) => String((x as any).code) === String(wardCode));
    setLocationData((prev) => ({
      ...prev,
      ward: w ? String((w as any).name) : "",
      location_id: undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let locationId = locationData.location_id;

      if (!locationId && locationData.city.trim()) {
        const loc = await createLocation({
          city: locationData.city.trim(),
          district: locationData.district.trim() || undefined,
          ward: locationData.ward.trim() || undefined,
        });
        locationId = loc.id;
      }

      let opening_hours: string | undefined;
      if (formData.opening_time && formData.closing_time) {
        opening_hours = `${formData.opening_time}-${formData.closing_time}`;
      }

      // ✅ address gửi lên: chỉ street + (tùy bạn) có thể ghép areaText
      // Nếu muốn backend lưu full address dễ hiển thị => ghép luôn:
      const fullAddress = [formData.address.trim(), areaText].filter(Boolean).join(", ");

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        address: fullAddress, // <-- ghép để khỏi phải gõ lại
        phone_number: formData.phone_number.trim(),
        opening_hours,
        slot_duration: formData.slot_duration || undefined,
        location_id: locationId,
      };

      if (restaurantId) await updateRestaurant(restaurantId, payload);
      else await createRestaurant(payload);

      onSuccess();
    } catch (e: any) {
      setError(e?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="text-center text-slate-400">Đang tải...</div>;
  }

  return (
    <div>
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-slate-300 hover:text-white mb-6 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Quay lại
      </button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">
          {restaurantId ? "Chỉnh sửa nhà hàng" : "Tạo nhà hàng mới"}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tên */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tên nhà hàng *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500 transition"
              required
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Mô tả
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500 transition resize-none"
            />
          </div>

          {/* ✅ Đưa box Khu vực lên TRƯỚC */}
          <div className="border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">
              Khu vực (Location)
            </h3>

            {!provincesReady && (
              <p className="text-xs text-yellow-400 mb-3">
                Đang tải dữ liệu tỉnh/thành...
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Tỉnh/Thành phố
                </label>
                <select
                  value={selectedProvinceCode}
                  onChange={handleProvinceChange}
                  disabled={!provincesReady}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Chọn tỉnh/thành phố --</option>
                  {provinces.map((p: any) => (
                    <option key={String(p.code)} value={String(p.code)}>
                      {String(p.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Quận/Huyện
                </label>
                <select
                  value={selectedDistrictCode}
                  onChange={handleDistrictChange}
                  disabled={!selectedProvinceCode}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Chọn quận/huyện --</option>
                  {districts.map((d: any) => (
                    <option key={String(d.code)} value={String(d.code)}>
                      {String(d.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Phường/Xã
                </label>
                <select
                  value={selectedWardCode}
                  onChange={handleWardChange}
                  disabled={!selectedDistrictCode}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Chọn phường/xã --</option>
                  {wards.map((w: any) => (
                    <option key={String(w.code)} value={String(w.code)}>
                      {String(w.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ✅ Hiển thị địa chỉ hành chính rõ ràng */}
            {areaText && (
              <div className="mt-3 p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400">Địa chỉ theo khu vực:</p>
                <p className="text-sm text-white mt-1">{areaText}</p>
              </div>
            )}
          </div>

          {/* ✅ Địa chỉ cụ thể + SĐT chuyển xuống dưới, vẫn 2 cột ngang */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Địa chỉ cụ thể *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder={addressPlaceholder}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                required
              />
              {/* mini hint dưới input (nhìn dễ hiểu) */}
              {areaText && (
                <p className="mt-1 text-xs text-slate-400">
                  Sẽ lưu thành:{" "}
                  <span className="text-slate-200">
                    {[formData.address.trim() || "…", areaText].join(", ")}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Điện thoại *
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                required
              />
            </div>
          </div>

          {/* Giờ + slot */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Giờ mở cửa
              </label>
              <input
                type="time"
                name="opening_time"
                value={formData.opening_time}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Giờ đóng cửa
              </label>
              <input
                type="time"
                name="closing_time"
                value={formData.closing_time}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Thời lượng 1 slot (phút)
              </label>
              <input
                type="number"
                name="slot_duration"
                min={30}
                step={30}
                value={formData.slot_duration}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 text-white font-semibold rounded-lg transition"
            >
              {loading ? "Đang xử lý..." : restaurantId ? "Cập nhật" : "Tạo nhà hàng"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 border border-slate-600 text-slate-300 hover:bg-slate-700/50 font-semibold rounded-lg transition"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
