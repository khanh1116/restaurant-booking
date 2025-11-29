// components/partner/MenuManagement.tsx
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, ImageIcon } from 'lucide-react';
import { fetchMenuItems, deleteMenuItem } from '@/lib/api';
import { buildImageUrl, PLACEHOLDER_IMAGE } from '@/lib/imageUtils';
import MenuItemForm from './MenuItemForm';

interface MenuManagementProps {
  restaurantId: string;
}

export default function MenuManagement({ restaurantId }: MenuManagementProps) {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadMenuItems();
  }, [restaurantId]);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const data = await fetchMenuItems(restaurantId);
      setMenuItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa món ăn này?')) return;

    try {
      await deleteMenuItem(id);
      setMenuItems(menuItems.filter((m) => m.id !== Number(id)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingId(null);
    loadMenuItems();
  };

  if (showForm) {
    return (
      <MenuItemForm
        restaurantId={restaurantId}
        menuItemId={editingId || undefined}
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Quản lý menu</h2>

        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
        >
          <Plus className="w-5 h-5" />
          Thêm món ăn
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            Đang tải...
          </div>
        </div>
      ) : menuItems.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
          <ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">Bạn chưa thêm món ăn nào</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
          >
            <Plus className="w-5 h-5" />
            Thêm món ăn đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const imageUrl = item.image_url ? buildImageUrl(item.image_url) : PLACEHOLDER_IMAGE;
            
            return (
              <div
                key={item.id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition group"
              >
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt={item.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = PLACEHOLDER_IMAGE;
                    }}
                  />
                  
                  {/* Overlay khi hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-white flex-1 line-clamp-1">
                      {item.name}
                    </h3>
                    
                    {item.category && (
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded ml-2 flex-shrink-0">
                        {item.category}
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <p className="text-2xl font-bold text-orange-500">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(item.price)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(String(item.id));
                        setShowForm(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition text-sm font-medium"
                    >
                      <Edit2 className="w-4 h-4" />
                      Sửa
                    </button>

                    <button
                      onClick={() => handleDelete(String(item.id))}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}