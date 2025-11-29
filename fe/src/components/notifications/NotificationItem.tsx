// src/components/notifications/NotificationItem.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Calendar, Home as HomeIcon, Utensils } from 'lucide-react';
import { 
  markNotificationAsRead, 
  deleteNotification,
  getNotificationTypeIcon,
  getNotificationTypeColor
} from '@/lib/api';
import type { Notification } from '@/lib/api';

interface NotificationItemProps {
  notification: Notification;
  onUpdate: () => void;
  onClose: () => void;
}

export default function NotificationItem({ 
  notification, 
  onUpdate,
  onClose 
}: NotificationItemProps) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleClick = async () => {
    // Mark as read if unread
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id);
        onUpdate();
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }

    // Navigate based on related object
    if (notification.related_object_type === 'booking') {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role === 'CUSTOMER') {
        navigate('/my-bookings');
      } else if (user.role === 'PARTNER') {
        navigate('/partner'); // Partner will see bookings section
      }
      onClose();
    } else if (notification.related_object_type === 'restaurant') {
      navigate('/partner');
      onClose();
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering handleClick
    
    if (!confirm('Xóa thông báo này?')) return;

    try {
      setDeleting(true);
      await deleteNotification(notification.id);
      onUpdate();
    } catch (error: any) {
      alert(error.message || 'Xóa thông báo thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'BOOKING':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'RESTAURANT':
        return <Utensils className="w-5 h-5 text-green-500" />;
      case 'SYSTEM':
        return <HomeIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <HomeIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const typeColorClass = getNotificationTypeColor(notification.type);

  return (
    <div
      onClick={handleClick}
      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer relative group ${
        !notification.is_read ? 'bg-amber-50/50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + Badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`font-semibold text-sm ${
              !notification.is_read ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {notification.title}
            </h4>

            {!notification.is_read && (
              <span className="flex-shrink-0 w-2 h-2 bg-amber-500 rounded-full mt-1.5"></span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {notification.message}
          </p>

          {/* Footer: Time + Type */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {notification.time_ago}
            </span>

            <span className={`text-xs px-2 py-0.5 rounded-full ${typeColorClass}`}>
              {notification.type_display}
            </span>
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50"
          title="Xóa thông báo"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
}