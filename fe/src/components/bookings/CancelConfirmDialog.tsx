// src/components/bookings/CancelConfirmDialog.tsx
import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

interface CancelConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export const CancelConfirmDialog: React.FC<CancelConfirmDialogProps> = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  loading 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-bold text-gray-900">Xác nhận hủy đặt bàn</h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          Bạn có chắc chắn muốn hủy đặt bàn này không? Hành động này không thể hoàn tác.
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
          >
            Không
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Xác nhận hủy
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelConfirmDialog;