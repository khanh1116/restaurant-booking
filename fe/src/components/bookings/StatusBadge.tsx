// src/components/bookings/StatusBadge.tsx
import React from 'react';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

interface StatusBadgeProps {
  status: BookingStatus;
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ xác nhận',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300'
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300'
  },
  REJECTED: {
    label: 'Đã từ chối',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300'
  },
  CANCELLED: {
    label: 'Đã hủy',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300'
  },
  COMPLETED: {
    label: 'Hoàn thành',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300'
  },
  NO_SHOW: {
    label: 'Không đến',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300'
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  
  return (
    <span 
      className={`px-3 py-1 rounded-full text-sm font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;