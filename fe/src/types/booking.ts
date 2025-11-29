// src/types/booking.ts
export type BookingStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'REJECTED' 
  | 'CANCELLED' 
  | 'COMPLETED' 
  | 'NO_SHOW';

export interface BookingListItem {
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

export interface Booking extends BookingListItem {
  customer_email?: string;
  restaurant_phone?: string;
  time_slot_info: {
    id: number;
    start_time: string;
    end_time: string;
    display: string;
  };
  special_request?: string;
  confirmed_at?: string;
  can_cancel: boolean;
  can_confirm: boolean;
  can_reject: boolean;
}

export interface FilterParams {
  status?: string;
  start_date?: string;
  end_date?: string;
}