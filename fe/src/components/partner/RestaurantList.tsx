// components/partner/RestaurantList.tsx
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { fetchMyRestaurants, deleteRestaurant } from '@/lib/api'; // ✅ Đổi thành fetchMyRestaurants
import RestaurantForm from './RestaurantForm';

interface RestaurantListProps {
  onSelectRestaurant: (id: string) => void;
}

export default function RestaurantList({ onSelectRestaurant }: RestaurantListProps) {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const data = await fetchMyRestaurants(); // ✅ Dùng API mới - chỉ lấy nhà hàng của mình
      setRestaurants(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa nhà hàng này?')) return;

    try {
      await deleteRestaurant(id);
      setRestaurants(restaurants.filter((r) => r.id !== Number(id)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingId(null);
    loadRestaurants();
  };

  if (showForm) {
    return (
      <RestaurantForm
        restaurantId={editingId || undefined}
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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Nhà hàng của tôi</h2>

        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Thêm nhà hàng
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center text-slate-400">Đang tải...</div>
      ) : restaurants.length === 0 ? (
        // Empty
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
          <p className="text-slate-400 mb-4">Bạn chưa có nhà hàng nào</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            Tạo nhà hàng đầu tiên
          </button>
        </div>
      ) : (
        // List
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">{restaurant.name}</h3>
                  
                  {/* Status Badge */}
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    restaurant.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                    restaurant.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                    restaurant.status === 'SUSPENDED' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {restaurant.status === 'APPROVED' ? 'Đã duyệt' :
                     restaurant.status === 'PENDING' ? 'Chờ duyệt' :
                     restaurant.status === 'SUSPENDED' ? 'Tạm ngưng' : 'Đóng cửa'}
                  </span>
                </div>

                {restaurant.description && (
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                    {restaurant.description}
                  </p>
                )}

                {/* Info */}
                <div className="space-y-2 mb-6">
                  <p className="text-slate-300 text-sm">
                    <span className="text-slate-400">Địa chỉ:</span> {restaurant.address}
                  </p>

                  <p className="text-slate-300 text-sm">
                    <span className="text-slate-400">Điện thoại:</span>{' '}
                    {restaurant.phone_number}
                  </p>

                  {restaurant.cuisine_type && (
                    <p className="text-slate-300 text-sm">
                      <span className="text-slate-400">Loại:</span> {restaurant.cuisine_type}
                    </p>
                  )}

                  {/* Giờ mở cửa */}
                  {restaurant.opening_time && restaurant.closing_time && (
                    <p className="text-slate-300 text-sm">
                      <span className="text-slate-400">Giờ:</span>{' '}
                      {restaurant.opening_time} - {restaurant.closing_time}
                    </p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => onSelectRestaurant(String(restaurant.id))}
                    className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium rounded-lg transition text-sm"
                  >
                    Xem chi tiết
                  </button>

                  <button
                    onClick={() => {
                      setEditingId(String(restaurant.id));
                      setShowForm(true);
                    }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(String(restaurant.id))}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}