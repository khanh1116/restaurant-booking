// src/components/bookings/Toast.tsx
import React, { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
      } text-white flex items-center gap-3 animate-slide-in`}
    >
      {type === 'success' ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <XCircle className="w-5 h-5" />
      )}
      <p className="font-medium">{message}</p>
    </div>
  );
};

export default Toast;