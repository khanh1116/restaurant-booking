// components/partner/TimeSlotForm.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Clock } from 'lucide-react';
import { createTimeSlot, updateTimeSlot, fetchTimeSlots } from '@/lib/api';

interface TimeSlotFormProps {
  restaurantId: string;
  slotId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TimeSlotForm({
  restaurantId,
  slotId,
  onSuccess,
  onCancel,
}: TimeSlotFormProps) {
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    max_bookings: '',
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(!!slotId);

  useEffect(() => {
    if (slotId) loadSlot();
  }, [slotId]);

  const loadSlot = async () => {
    try {
      const slots = await fetchTimeSlots(restaurantId);
      const slot = slots.find((s: any) => s.id === Number(slotId));

      if (slot) {
        setFormData({
          start_time: slot.start_time,
          end_time: slot.end_time,
          max_bookings: slot.max_bookings?.toString() || '',
          is_active: slot.is_active,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        start_time: formData.start_time,
        end_time: formData.end_time,
        is_active: formData.is_active,
      };

      if (formData.max_bookings)
        payload.max_bookings = Number(formData.max_bookings);

      if (slotId) {
        await updateTimeSlot(slotId, payload);
      } else {
        await createTimeSlot({
          restaurant_id: Number(restaurantId),
          ...payload,
        });
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          Đang tải...
        </div>
      </div>
    );
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
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Clock className="w-6 h-6 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {slotId ? 'Chỉnh sửa khung giờ' : 'Thêm khung giờ mới'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Start time */}
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              Giờ bắt đầu <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
            />
          </div>

          {/* End time */}
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              Giờ kết thúc <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
            />
          </div>

          {/* Max bookings */}
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              Số lượt tối đa
            </label>
            <input
              type="number"
              name="max_bookings"
              value={formData.max_bookings}
              onChange={handleChange}
              placeholder="VD: 20"
              min="1"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
            />
            <p className="text-xs text-slate-500 mt-1">Để trống nếu không giới hạn</p>
          </div>

          {/* Active */}
          <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-5 h-5 text-orange-500 bg-slate-900 border-slate-600 rounded focus:ring-orange-500 focus:ring-2"
            />
            <label htmlFor="is_active" className="text-slate-300 text-sm font-medium cursor-pointer">
              Kích hoạt khung giờ này
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Đang xử lý...
              </span>
            ) : slotId ? (
              'Cập nhật'
            ) : (
              'Thêm khung giờ'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}