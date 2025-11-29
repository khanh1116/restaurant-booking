// src/components/partner/BookingList.tsx
import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Clock, Calendar, Users, MapPin, Phone, Mail, Loader2 } from 'lucide-react';
import { 
  fetchBookings, 
  confirmBooking, 
  rejectBooking, 
  completeBooking, 
  markNoShow,
  type BookingListItem 
} from '@/lib/api';

type FilterStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export default function BookingList() {
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');
      // Partner sẽ thấy bookings của tất cả restaurants thuộc partner
      const data = await fetchBookings({
        order_by: '-created_at'
      });
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tải danh sách booking');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (bookingId: number) => {
    setActionLoading(`confirm-${bookingId}`);
    try {
      await confirmBooking(bookingId);
      await loadBookings(); // Refresh list
    } catch (err: any) {
      alert(err.message || 'Xác nhận booking thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (bookingId: number) => {
    if (!confirm('Bạn có chắc muốn từ chối booking này?')) return;
    
    setActionLoading(`reject-${bookingId}`);
    try {
      await rejectBooking(bookingId);
      await loadBookings();
    } catch (err: any) {
      alert(err.message || 'Từ chối booking thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (bookingId: number) => {
    setActionLoading(`complete-${bookingId}`);
    try {
      await completeBooking(bookingId);
      await loadBookings();
    } catch (err: any) {
      alert(err.message || 'Đánh dấu hoàn thành thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNoShow = async (bookingId: number) => {
    if (!confirm('Đánh dấu khách không đến?')) return;
    
    setActionLoading(`noshow-${bookingId}`);
    try {
      await markNoShow(bookingId);
      await loadBookings();
    } catch (err: any) {
      alert(err.message || 'Đánh dấu no-show thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBookings = filter === 'ALL'
    ? bookings
    : bookings.filter((b) => b.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      case 'COMPLETED':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'CANCELLED':
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
      case 'REJECTED':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'NO_SHOW':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      default: // PENDING
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div>
      {/* Filter Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Danh sách booking</h2>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'ALL', label: 'Tất cả' },
            { value: 'PENDING', label: 'Chờ xác nhận' },
            { value: 'CONFIRMED', label: 'Đã xác nhận' },
            { value: 'COMPLETED', label: 'Hoàn thành' },
            { value: 'REJECTED', label: 'Đã từ chối' },
            { value: 'CANCELLED', label: 'Đã hủy' },
            { value: 'NO_SHOW', label: 'Không đến' },
          ].map((status) => (
            <button
              key={status.value}
              onClick={() => setFilter(status.value as FilterStatus)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === status.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
          <p className="text-slate-400">Không có booking nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Restaurant & Customer Info */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">
                    {booking.restaurant_name}
                  </h3>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-start gap-2 text-slate-300">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                      <span>{booking.restaurant_address}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-4 space-y-2 text-sm">
                    <p className="text-slate-300">
                      <span className="text-slate-400">Khách:</span>{' '}
                      <span className="font-medium">{booking.customer_name}</span>
                    </p>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{booking.customer_phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{booking.number_of_guests} người</span>
                    </div>
                  </div>
                </div>

                {/* Right Column - Booking Details & Actions */}
                <div>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{formatDate(booking.booking_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{booking.time_slot_display}</span>
                    </div>
                    <p className="text-slate-400 text-xs">
                      Đặt lúc: {new Intl.DateTimeFormat('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(new Date(booking.created_at))}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className={`p-3 rounded-lg border text-center font-medium text-sm mb-4 ${getStatusColor(booking.status)}`}>
                    {booking.status_display}
                  </div>

                  {/* Action Buttons */}
                  {booking.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirm(booking.id)}
                        disabled={actionLoading === `confirm-${booking.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading === `confirm-${booking.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Xác nhận
                      </button>
                      <button
                        onClick={() => handleReject(booking.id)}
                        disabled={actionLoading === `reject-${booking.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading === `reject-${booking.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Từ chối
                      </button>
                    </div>
                  )}

                  {booking.status === 'CONFIRMED' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleComplete(booking.id)}
                        disabled={actionLoading === `complete-${booking.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading === `complete-${booking.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Hoàn thành
                      </button>
                      <button
                        onClick={() => handleNoShow(booking.id)}
                        disabled={actionLoading === `noshow-${booking.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading === `noshow-${booking.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        No-show
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}