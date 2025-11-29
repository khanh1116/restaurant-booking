// src/lib/imageUtils.ts

/**
 * Build full URL từ relative image path
 * @param relativePath - Đường dẫn tương đối từ backend (vd: "menu_items/abc.jpg")
 * @returns Full URL để hiển thị ảnh
 */
export function buildImageUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return '';
  
  const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
  
  // Nếu đã là full URL thì return luôn
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Xóa leading slash nếu có
  const cleanPath = relativePath.startsWith('/') 
    ? relativePath.slice(1) 
    : relativePath;
  
  return `${BASE}/media/${cleanPath}`;
}

/**
 * Placeholder image khi không có ảnh
 */
export const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23334155"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="%2394a3b8"%3ENo Image%3C/text%3E%3C/svg%3E';