// src/components/bookings/BookingCard.tsx
import React from 'react';
import { Calendar, Users, Clock, MapPin } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

interface BookingListItem {
  id: number;
  customer_name: string;
  customer_phone: string;
  restaurant_name: string;
  restaurant_address: string;
  booking_date: string;
  time_slot_display: string;
  number_of_guests: number;
  status: BookingStatus;
  status_display: string;
  created_at: string;
}

interface BookingCardProps {
  booking: BookingListItem;
  onViewDetail: (id: number) => void;
  onCancel: (id: number) => void;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

export const BookingCard: React.FC<BookingCardProps> = ({ 
  booking, 
  onViewDetail, 
  onCancel 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {booking.restaurant_name}
          </h3>
          
          <div className="space-y-2 text-gray-600">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
              <span className="text-sm">{booking.restaurant_address}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{formatShortDate(booking.booking_date)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{booking.time_slot_display}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">{booking.number_of_guests} người</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <StatusBadge status={booking.status as BookingStatus} />
          
          <div className="flex gap-2">
            <button
              onClick={() => onViewDetail(booking.id)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Xem chi tiết
            </button>
            
            {booking.status === 'PENDING' && (
              <button
                onClick={() => onCancel(booking.id)}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Hủy
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCard;