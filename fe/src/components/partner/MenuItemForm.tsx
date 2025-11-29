// components/partner/MenuItemForm.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Upload, X } from 'lucide-react';
import { createMenuItem, updateMenuItem, fetchMenuItems, uploadMenuItemImage } from '@/lib/api';
import { buildImageUrl } from '@/lib/imageUtils';

interface MenuItemFormProps {
  restaurantId: string;
  menuItemId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MenuItemForm({
  restaurantId,
  menuItemId,
  onSuccess,
  onCancel,
}: MenuItemFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
  });

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(!!menuItemId);

  useEffect(() => {
    if (menuItemId) loadMenuItem();
  }, [menuItemId]);

  const loadMenuItem = async () => {
    try {
      const items = await fetchMenuItems(restaurantId);
      const item = items.find((m) => m.id === Number(menuItemId));

      if (item) {
        setFormData({
          name: item.name || '',
          description: item.description || '',
          price: item.price.toString(),
          category: item.category || '',
        });

        // ✅ Sử dụng helper function
        if (item.image_url) {
          setPreview(buildImageUrl(item.image_url));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        restaurant_id: Number(restaurantId),
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
      };

      let resultMenuItemId: number;

      if (menuItemId) {
        await updateMenuItem(menuItemId, payload);
        resultMenuItemId = Number(menuItemId);
      } else {
        const created = await createMenuItem(payload);
        resultMenuItemId = created.data.id;
      }

      if (image) {
        await uploadMenuItemImage(String(resultMenuItemId), image);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Kiểm tra kích thước file (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Kích thước ảnh không được vượt quá 5MB');
        return;
      }
      
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const clearImage = () => {
    setImage(null);
    setPreview('');
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
      <button onClick={onCancel} className="text-slate-300 hover:text-white mb-6 flex gap-2 items-center transition">
        <ArrowLeft className="w-5 h-5" />
        Quay lại
      </button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">
          {menuItemId ? 'Chỉnh sửa món ăn' : 'Thêm món ăn'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              Tên món <span className="text-red-400">*</span>
            </label>
            <input
              name="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
              placeholder="Tên món"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">Mô tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition resize-none"
              placeholder="Mô tả món ăn..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                Giá <span className="text-red-400">*</span>
              </label>
              <input
                name="price"
                required
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                placeholder="50000"
              />
            </div>

            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block">Danh mục</label>
              <input
                name="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                placeholder="Món chính, Đồ uống..."
              />
            </div>
          </div>

          {/* IMAGE UPLOAD */}
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">Ảnh món ăn</label>
            
            {preview ? (
              <div className="relative mb-4 group">
                <img 
                  src={preview} 
                  className="w-full h-64 object-cover rounded-lg" 
                  alt="Preview"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23334155"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="%2394a3b8"%3ELỗi tải ảnh%3C/text%3E%3C/svg%3E';
                  }}
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : null}

            <label className="flex flex-col items-center justify-center w-full px-4 py-8 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-slate-900/50 transition">
              <Upload className="w-10 h-10 text-slate-400 mb-2" />
              <span className="text-slate-300 mb-1 font-medium">
                {preview ? 'Thay đổi ảnh' : 'Chọn ảnh...'}
              </span>
              <span className="text-xs text-slate-500">JPG, PNG lên đến 5MB</span>
              
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleImageChange}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Đang xử lý...
              </span>
            ) : menuItemId ? (
              'Cập nhật món ăn'
            ) : (
              'Thêm món ăn'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}