// src/components/bookings/BookingFilters.tsx
import React, { useState } from 'react';

interface FilterParams {
  status?: string;
  start_date?: string;
  end_date?: string;
}

interface BookingFiltersProps {
  onFilterChange: (filters: FilterParams) => void;
}

export const BookingFilters: React.FC<BookingFiltersProps> = ({ onFilterChange }) => {
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApply = () => {
    onFilterChange({
      status: status || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    });
  };

  const handleReset = () => {
    setStatus('');
    setStartDate('');
    setEndDate('');
    onFilterChange({});
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tất cả</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="NO_SHOW">Không đến</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Từ ngày
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Đến ngày
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Áp dụng
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingFilters;