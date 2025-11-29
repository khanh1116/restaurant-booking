// components/partner/TimeSlotManagement.tsx
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, Clock } from 'lucide-react';
import { fetchTimeSlots, deleteTimeSlot } from '@/lib/api';
import TimeSlotForm from './TimeSlotForm';

interface TimeSlotManagementProps {
  restaurantId: string;
}

export default function TimeSlotManagement({ restaurantId }: TimeSlotManagementProps) {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadSlots();
  }, [restaurantId]);

  const loadSlots = async () => {
    try {
      setLoading(true);
      const data = await fetchTimeSlots(restaurantId);
      const sorted = data.sort((a: any, b: any) =>
        a.start_time.localeCompare(b.start_time)
      );
      setSlots(sorted);
    } catch (err: any) {
      setError(err.message || "Lỗi tải danh sách khung giờ");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa khung giờ này?")) return;

    try {
      await deleteTimeSlot(id);
      setSlots(slots.filter((s) => s.id !== Number(id)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingId(null);
    loadSlots();
  };

  if (showForm) {
    return (
      <TimeSlotForm
        restaurantId={restaurantId}
        slotId={editingId || undefined}
        onSuccess={handleFormSubmit}
        onCancel={() => {
          setShowForm(false);
          setEditingId(null);
        }}
      />
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Quản lý khung giờ</h2>

        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
        >
          <Plus className="w-5 h-5" />
          Thêm khung giờ
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            Đang tải...
          </div>
        </div>
      ) : slots.length === 0 ? (
        // EMPTY
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
          <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">Chưa có khung giờ nào</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition"
          >
            <Plus className="w-5 h-5" />
            Thêm khung giờ đầu tiên
          </button>
        </div>
      ) : (
        // LIST
        <div className="space-y-3">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${slot.is_active ? 'bg-green-500/20' : 'bg-slate-700/50'}`}>
                  <Clock className={`w-5 h-5 ${slot.is_active ? 'text-green-400' : 'text-slate-500'}`} />
                </div>
                
                <div>
                  <p className="text-white font-semibold text-lg">
                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                  </p>

                  <div className="flex items-center gap-4 mt-1">
                    {slot.max_bookings && (
                      <p className="text-slate-400 text-sm">
                        Tối đa <span className="text-orange-400 font-medium">{slot.max_bookings}</span> lượt đặt
                      </p>
                    )}

                    <span className={`text-xs px-2 py-1 rounded ${
                      slot.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {slot.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingId(String(slot.id));
                    setShowForm(true);
                  }}
                  className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition"
                  title="Sửa"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(String(slot.id))}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {slots.length > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <p className="text-slate-400">
            Tổng cộng <span className="text-orange-500 font-semibold">{slots.length}</span> khung giờ
          </p>
          <p className="text-slate-400">
            <span className="text-green-400 font-semibold">{slots.filter(s => s.is_active).length}</span> đang hoạt động
          </p>
        </div>
      )}
    </div>
  );
}