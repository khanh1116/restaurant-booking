// src/pages/RestaurantPublicPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Star, 
  ChevronLeft, 
  X,
  ImageIcon,
  AlertCircle 
} from 'lucide-react';
import { fetchRestaurant } from '@/lib/api';
import { buildImageUrl, PLACEHOLDER_IMAGE } from '@/lib/imageUtils';
import type { RestaurantDetail, MenuItem, RestaurantImage } from '@/lib/api';

export default function RestaurantPublicPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Gallery modal state
  const [showGallery, setShowGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Menu filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (!id) return;
    loadRestaurant();
  }, [id]);

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      const data = await fetchRestaurant(id!);
      setRestaurant(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải thông tin nhà hàng');
    } finally {
      setLoading(false);
    }
  };

  // Get sorted images by display_order
  const sortedImages = restaurant?.images 
    ? [...restaurant.images].sort((a, b) => a.display_order - b.display_order)
    : [];

  const heroImage = sortedImages[0];
  const galleryImages = sortedImages.slice(1, 4); // Images 1-3
  const remainingCount = Math.max(0, sortedImages.length - 4);

  // Get unique categories
  const categories = ['all', ...new Set(
    restaurant?.menu_items
      ?.filter(item => item.category)
      .map(item => item.category) || []
  )];

  // Filter menu items
  const filteredMenuItems = restaurant?.menu_items?.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  }) || [];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-400 text-lg">Đang tải thông tin nhà hàng...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Không tìm thấy nhà hàng</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* HERO SECTION */}
      <div className="relative h-[60vh] min-h-[500px]">
        <img
          src={heroImage ? buildImageUrl(heroImage.image_url) : PLACEHOLDER_IMAGE}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER_IMAGE;
          }}
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 pb-12">
            <button
              onClick={() => navigate(-1)}
              className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition"
            >
              <ChevronLeft className="w-5 h-5" />
              Quay lại
            </button>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              {restaurant.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-lg">
              {restaurant.rating > 0 && (
                <div className="flex items-center gap-2 text-orange-400">
                  <Star className="w-5 h-5 fill-orange-400" />
                  <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-5 h-5" />
                <span>{restaurant.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GALLERY PREVIEW */}
      {galleryImages.length > 0 && (
        <div className="container mx-auto px-4 -mt-20 relative z-10">
          <div className="grid grid-cols-3 gap-4">
            {galleryImages.map((img, idx) => (
              <div
                key={img.id}
                className="relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => {
                  setCurrentImageIndex(idx + 1);
                  setShowGallery(true);
                }}
              >
                <img
                  src={buildImageUrl(img.image_url)}
                  alt={`${restaurant.name} - ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.src = PLACEHOLDER_IMAGE;
                  }}
                />
                
                {idx === 2 && remainingCount > 0 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      +{remainingCount} ảnh
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT: Restaurant Info */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold text-white mb-6">Thông tin</h2>
              
              <div className="space-y-4">
                {/* Address */}
                <div className="flex gap-3">
                  <MapPin className="w-5 h-5 text-orange-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Địa chỉ</p>
                    <p className="text-white">{restaurant.address}</p>
                    {restaurant.location && (
                      <p className="text-slate-400 text-sm mt-1">
                        {restaurant.location.ward && `${restaurant.location.ward}, `}
                        {restaurant.location.district && `${restaurant.location.district}, `}
                        {restaurant.location.city}
                      </p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                {restaurant.phone_number && (
                  <div className="flex gap-3">
                    <Phone className="w-5 h-5 text-orange-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Điện thoại</p>
                      <a
                        href={`tel:${restaurant.phone_number}`}
                        className="text-white hover:text-orange-400 transition"
                      >
                        {restaurant.phone_number}
                      </a>
                    </div>
                  </div>
                )}

                {/* Hours */}
                {restaurant.opening_hours && (
                  <div className="flex gap-3">
                    <Clock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Giờ mở cửa</p>
                      <p className="text-white">{restaurant.opening_hours}</p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {restaurant.description && (
                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400 mb-2">Giới thiệu</p>
                    <p className="text-slate-300 leading-relaxed">
                      {restaurant.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Menu */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">Thực đơn</h2>
              
              {categories.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        selectedCategory === cat
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {cat === 'all' ? 'Tất cả' : cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filteredMenuItems.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
                <ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Chưa có món ăn nào</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition group"
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                      <img
                        src={item.image_url ? buildImageUrl(item.image_url) : PLACEHOLDER_IMAGE}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.currentTarget.src = PLACEHOLDER_IMAGE;
                        }}
                      />
                      
                      {!item.is_available && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-semibold">Tạm hết</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-white flex-1">
                          {item.name}
                        </h3>
                        {item.category && (
                          <span className="ml-2 px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                            {item.category}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <p className="text-2xl font-bold text-orange-500">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GALLERY MODAL */}
      {showGallery && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowGallery(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="max-w-5xl w-full">
            <img
              src={buildImageUrl(sortedImages[currentImageIndex]?.image_url)}
              alt={`${restaurant.name} - ${currentImageIndex + 1}`}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              onError={(e) => {
                e.currentTarget.src = PLACEHOLDER_IMAGE;
              }}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                disabled={currentImageIndex === 0}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white transition"
              >
                Trước
              </button>

              <span className="text-white">
                {currentImageIndex + 1} / {sortedImages.length}
              </span>

              <button
                onClick={() => setCurrentImageIndex(Math.min(sortedImages.length - 1, currentImageIndex + 1))}
                disabled={currentImageIndex === sortedImages.length - 1}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white transition"
              >
                Tiếp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}