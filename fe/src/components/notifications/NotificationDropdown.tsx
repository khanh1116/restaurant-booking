// src/components/notifications/NotificationDropdown.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, Trash2, Loader2 } from 'lucide-react';
import NotificationItem from './NotificationItem';
import { markAllNotificationsAsRead, deleteAllReadNotifications } from '@/lib/api';
import type { Notification } from '@/lib/api';

interface NotificationDropdownProps {
  notifications: Notification[];
  loading: boolean;
  position?: 'left' | 'right';
  onClose: () => void;
  onRefresh: () => void;
}

export default function NotificationDropdown({
  notifications,
  loading,
  position = 'right',
  onClose,
  onRefresh
}: NotificationDropdownProps) {
  const [actionLoading, setActionLoading] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const hasUnread = unreadNotifications.length > 0;
  const displayNotifications = notifications.slice(0, 10); // Show max 10

  const handleMarkAllAsRead = async () => {
    if (!hasUnread) return;
    
    try {
      setActionLoading(true);
      await markAllNotificationsAsRead();
      onRefresh(); // Refresh list
    } catch (error: any) {
      alert(error.message || 'Đánh dấu tất cả đã đọc thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAllRead = async () => {
    const readCount = notifications.filter(n => n.is_read).length;
    if (readCount === 0) {
      alert('Không có thông báo đã đọc để xóa');
      return;
    }

    if (!confirm(`Xóa ${readCount} thông báo đã đọc?`)) return;

    try {
      setActionLoading(true);
      await deleteAllReadNotifications();
      onRefresh(); // Refresh list
    } catch (error: any) {
      alert(error.message || 'Xóa thông báo thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className={`absolute top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 ${
        position === 'right' ? 'right-0' : 'left-0'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Thông báo</h3>
          {hasUnread && (
            <p className="text-sm text-amber-600">
              {unreadNotifications.length} chưa đọc
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mark all as read */}
          {hasUnread && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={actionLoading}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 disabled:opacity-50"
              title="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}

          {/* Delete all read */}
          <button
            onClick={handleDeleteAllRead}
            disabled={actionLoading}
            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 disabled:opacity-50"
            title="Xóa tất cả đã đọc"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          </div>
        ) : displayNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <Bell className="w-12 h-12 mx-auto opacity-30" />
            </div>
            <p className="text-gray-500">Không có thông báo</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onUpdate={onRefresh}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 10 && (
        <div className="border-t border-slate-200 p-3">
          <Link
            to="/notifications"
            onClick={onClose}
            className="block text-center text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            Xem tất cả thông báo ({notifications.length})
          </Link>
        </div>
      )}
    </div>
  );
}

function Bell({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}