// src/components/notifications/NotificationBell.tsx
import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { fetchNotifications, getUnreadNotificationCount } from '@/lib/api';
import type { Notification } from '@/lib/api';

interface NotificationBellProps {
  position?: 'left' | 'right';
}

export default function NotificationBell({ position = 'right' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchData = async () => {
    try {
      setLoading(true);
      const [notifData, countData] = await Promise.all([
        fetchNotifications(),
        getUnreadNotificationCount()
      ]);
      
      setNotifications(notifData.data || []);
      setUnreadCount(countData.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchData(); // Refresh when opening
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-amber-600 transition-colors rounded-full hover:bg-gray-100"
        aria-label="Thông báo"
      >
        <Bell className="w-6 h-6" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          position={position}
          onClose={() => setIsOpen(false)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}