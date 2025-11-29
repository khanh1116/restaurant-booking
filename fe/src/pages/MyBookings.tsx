// src/pages/MyBookings.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Loader2, AlertCircle } from 'lucide-react';
import { BookingCard } from '@/components/bookings/BookingCard';
import { BookingFilters } from '@/components/bookings/BookingFilters';
import { BookingDetailModal } from '@/components/bookings/BookingDetailModal';
import { CancelConfirmDialog } from '@/components/bookings/CancelConfirmDialog';
import { Toast } from '@/components/bookings/Toast';
import { fetchBookings, cancelBooking } from '@/lib/api';
import type { BookingListItem } from '@/lib/api';

interface FilterParams {
  status?: string;
  start_date?: string;
  end_date?: string;
}

const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  
  // Main state
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterParams>({});
  
  // Modal state
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load bookings on mount
  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async (newFilters?: FilterParams) => {
    setLoading(true);
    setError('');
    
    try {
      const data = await fetchBookings(newFilters || filters);
      setBookings(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unauthorized')) {
        navigate('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: FilterParams) => {
    setFilters(newFilters);
    loadBookings(newFilters);
  };

  const handleViewDetail = (id: number) => {
    setSelectedBookingId(id);
    setDetailModalOpen(true);
  };

  const handleCancelClick = (id: number) => {
    setBookingToCancel(id);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!bookingToCancel) return;
    
    setCancelling(true);
    
    try {
      await cancelBooking(bookingToCancel);
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      setToast({ message: 'Hủy đặt bàn thành công', type: 'success' });
      loadBookings();
    } catch (err) {
      setToast({ 
        message: err instanceof Error ? err.message : 'Hủy booking thất bại', 
        type: 'error' 
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Đặt bàn của tôi</h1>
            <p className="text-gray-600 mt-1">Quản lý các đặt bàn của bạn</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Đặt bàn mới
          </button>
        </div>

        {/* Filters */}
        <BookingFilters onFilterChange={handleFilterChange} />

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && bookings.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Chưa có đặt bàn nào
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn chưa có lịch đặt bàn nào. Hãy đặt bàn ngay!
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Đặt bàn ngay
            </button>
          </div>
        )}

        {/* Bookings List */}
        {!loading && !error && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onViewDetail={handleViewDetail}
                onCancel={handleCancelClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <BookingDetailModal
        bookingId={selectedBookingId}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedBookingId(null);
        }}
        onCancelSuccess={() => {
          setToast({ message: 'Hủy đặt bàn thành công', type: 'success' });
          loadBookings();
        }}
      />

      {/* Cancel Confirm Dialog */}
      <CancelConfirmDialog
        isOpen={cancelDialogOpen}
        onConfirm={handleCancelConfirm}
        onCancel={() => {
          setCancelDialogOpen(false);
          setBookingToCancel(null);
        }}
        loading={cancelling}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default MyBookings;