// src/components/bookings/BookingDetailModal.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, MapPin, Phone, X, Loader2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { CancelConfirmDialog } from './CancelConfirmDialog';
import { fetchBooking, cancelBooking } from '@/lib/api';
import type { Booking } from '@/lib/api';

interface BookingDetailModalProps {
  bookingId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelSuccess: () => void;
}

function formatBookingDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function formatDateTime(dateTimeStr: string): string {
  const date = new Date(dateTimeStr);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ 
  bookingId, 
  isOpen, 
  onClose, 
  onCancelSuccess 
}) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (isOpen && bookingId) {
      loadBookingDetail();
    }
  }, [isOpen, bookingId]);

  const loadBookingDetail = async () => {
    if (!bookingId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const data = await fetchBooking(bookingId);
      setBooking(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!bookingId) return;
    
    setCancelling(true);
    
    try {
      await cancelBooking(bookingId);
      setShowCancelDialog(false);
      onClose();
      onCancelSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Hủy booking thất bại');
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-2xl w-full my-8">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg">
            <h2 className="text-2xl font-bold text-gray-900">Chi tiết đặt bàn</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[calc(90vh-8rem)] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}

            {booking && (
              <div className="space-y-6">
                {/* Restaurant Info */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Thông tin nhà hàng</h3>
                  <div className="space-y-3 text-gray-700">
                    <p className="text-xl font-semibold">{booking.restaurant_name}</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span>{booking.restaurant_address}</span>
                    </div>
                    {booking.restaurant_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-5 h-5" />
                        <a 
                          href={`tel:${booking.restaurant_phone}`} 
                          className="text-blue-600 hover:underline"
                        >
                          {booking.restaurant_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Info */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Thông tin đặt bàn</h3>
                  <div className="space-y-3 text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <span>{formatBookingDate(booking.booking_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span>{booking.time_slot_info.display}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <span>{booking.number_of_guests} người</span>
                    </div>
                    {booking.special_request && (
                      <div className="bg-gray-50 rounded-lg p-4 mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Yêu cầu đặc biệt:
                        </p>
                        <p className="text-gray-600">{booking.special_request}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Trạng thái</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Thời gian tạo:</span>
                      <span className="font-medium">{formatDateTime(booking.created_at)}</span>
                    </div>
                    {booking.confirmed_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Thời gian xác nhận:</span>
                        <span className="font-medium">{formatDateTime(booking.confirmed_at)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Trạng thái hiện tại:</span>
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t pt-6 flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Đóng
                  </button>
                  
                  {booking.can_cancel && (
                    <button
                      onClick={() => setShowCancelDialog(true)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Hủy đặt bàn
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CancelConfirmDialog
        isOpen={showCancelDialog}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelDialog(false)}
        loading={cancelling}
      />
    </>
  );
};

export default BookingDetailModal;