import { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { createRestaurant, updateRestaurant, fetchRestaurant, createLocation } from '@/lib/api';

interface RestaurantFormProps {
  restaurantId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type MainFormState = {
  name: string;
  description: string;
  address: string;
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

export default function RestaurantForm({ restaurantId, onSuccess, onCancel }: RestaurantFormProps) {
  const [formData, setFormData] = useState<MainFormState>({
    name: '',
    description: '',
    address: '',
    phone_number: '',
    opening_time: '',
    closing_time: '',
    slot_duration: 120,
  });

  const [locationData, setLocationData] = useState<LocationFormState>({
    city: '',
    district: '',
    ward: '',
    location_id: undefined,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(!!restaurantId);

  useEffect(() => {
    if (restaurantId) {
      loadRestaurant();
    }
  }, [restaurantId]);

  const loadRestaurant = async () => {
    try {
      const data = await fetchRestaurant(restaurantId!);

      // Parse opening_hours "HH:MM-HH:MM" → opening_time / closing_time
      let opening_time = '';
      let closing_time = '';
      if (data.opening_hours) {
        const parts = data.opening_hours.split('-').map((s) => s.trim());
        opening_time = parts[0] || '';
        closing_time = parts[1] || '';
      }

      setFormData({
        name: data.name || '',
        description: data.description || '',
        address: data.address || '',
        phone_number: data.phone_number || '',
        opening_time,
        closing_time,
        slot_duration: data.slot_duration || 120,
      });

      setLocationData({
        city: data.location?.city || '',
        district: data.location?.district || '',
        ward: data.location?.ward || '',
        location_id: data.location?.id,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Field của location
    if (name === 'city' || name === 'district' || name === 'ward') {
      setLocationData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    if (name === 'slot_duration') {
      setFormData((prev) => ({
        ...prev,
        slot_duration: Number(value) || 0,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let locationId = locationData.location_id;

      // Nếu chưa có location_id mà user nhập city → tạo location mới
      if (!locationId && locationData.city.trim()) {
        const loc = await createLocation({
          city: locationData.city.trim(),
          district: locationData.district.trim() || undefined,
          ward: locationData.ward.trim() || undefined,
        });
        locationId = loc.id;
      }

      // Ghép opening_hours từ opening_time + closing_time
      let opening_hours: string | undefined = undefined;
      if (formData.opening_time && formData.closing_time) {
        opening_hours = `${formData.opening_time}-${formData.closing_time}`;
      }

      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        description: formData.description.trim() || undefined,
        phone_number: formData.phone_number.trim() || undefined,
        opening_hours,
        slot_duration: formData.slot_duration || undefined,
        location_id: locationId,
      };

      if (restaurantId) {
        await updateRestaurant(restaurantId, payload);
      } else {
        await createRestaurant(payload);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
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
          {restaurantId ? 'Chỉnh sửa nhà hàng' : 'Tạo nhà hàng mới'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tên nhà hàng */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tên nhà hàng *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
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
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition resize-none"
            />
          </div>

          {/* Địa chỉ + Điện thoại */}
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
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                required
              />
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

          {/* Location */}
          <div className="border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">
              Khu vực (Location)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Thành phố
                </label>
                <input
                  type="text"
                  name="city"
                  value={locationData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                  placeholder="VD: TP. HCM"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Quận / Huyện
                </label>
                <input
                  type="text"
                  name="district"
                  value={locationData.district}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                  placeholder="VD: Quận 1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Phường / Xã
                </label>
                <input
                  type="text"
                  name="ward"
                  value={locationData.ward}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                  placeholder="VD: Phường Bến Nghé"
                />
              </div>
            </div>
            {locationData.location_id && (
              <p className="mt-2 text-xs text-slate-400">
                Đang sử dụng Location ID: {locationData.location_id} (từ backend)
              </p>
            )}
          </div>

          {/* Giờ mở / đóng + slot_duration */}
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

          {/* Buttons */}
          <div className="flex gap-3 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 text-white font-semibold rounded-lg transition"
            >
              {loading ? 'Đang xử lý...' : restaurantId ? 'Cập nhật' : 'Tạo nhà hàng'}
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
