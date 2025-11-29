// components/partner/RestaurantImages.tsx
import { useState, useEffect } from 'react';
import { Upload, Trash2, AlertCircle, ImageIcon } from 'lucide-react';
import { uploadRestaurantImage, fetchRestaurantImages, deleteRestaurantImage } from '@/lib/api';
import { buildImageUrl, PLACEHOLDER_IMAGE } from '@/lib/imageUtils';

interface RestaurantImagesProps {
  restaurantId: string;
}

export default function RestaurantImages({ restaurantId }: RestaurantImagesProps) {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    loadImages();
  }, [restaurantId]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const data = await fetchRestaurantImages(restaurantId);
      setImages(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra kích thước file (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Kích thước ảnh không được vượt quá 10MB');
      e.target.value = '';
      return;
    }

    setUploadError('');
    setUploading(true);

    try {
      const result = await uploadRestaurantImage(restaurantId, file);
      setImages([...images, result.data]);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa ảnh này?')) return;

    try {
      await deleteRestaurantImage(imageId);
      setImages(images.filter((img) => img.id !== Number(imageId)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Ảnh nhà hàng</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{uploadError}</p>
        </div>
      )}

      {/* Upload UI */}
      <div className="mb-8">
        <label className={`flex items-center justify-center w-full px-4 py-12 border-2 border-dashed rounded-lg cursor-pointer transition ${
          uploading 
            ? 'border-orange-500 bg-orange-500/5' 
            : 'border-slate-600 hover:border-orange-500 hover:bg-slate-900/50'
        }`}>
          <div className="flex flex-col items-center justify-center">
            <Upload className={`w-12 h-12 mb-3 ${uploading ? 'text-orange-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-lg font-medium text-slate-300 mb-1">
              {uploading ? 'Đang upload...' : 'Upload ảnh nhà hàng'}
            </span>
            <span className="text-sm text-slate-400">PNG, JPG lên đến 10MB</span>
            {uploading && (
              <div className="mt-3 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                <span className="text-sm text-orange-500">Đang xử lý...</span>
              </div>
            )}
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Danh sách ảnh */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            Đang tải...
          </div>
        </div>
      ) : images.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
          <ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Bạn chưa upload ảnh nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => {
            // Xử lý cả image_url và url (backend có thể trả về 1 trong 2)
            const imagePath = image.image_url || image.url;
            const imageUrl = buildImageUrl(imagePath);
            
            return (
              <div
                key={image.id}
                className="relative group bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition"
              >
                <img
                  src={imageUrl}
                  alt="Restaurant"
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = PLACEHOLDER_IMAGE;
                  }}
                />

                {/* Overlay khi hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(String(image.id))}
                    className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition shadow-lg transform hover:scale-110"
                    title="Xóa ảnh"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Footer info */}
                {image.created_at && (
                  <div className="p-3 bg-slate-900/80 border-t border-slate-700">
                    <p className="text-xs text-slate-400 text-center">
                      {new Date(image.created_at).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {images.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Tổng cộng <span className="text-orange-500 font-semibold">{images.length}</span> ảnh
          </p>
        </div>
      )}
    </div>
  );
}