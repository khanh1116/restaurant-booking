// src/pages/Partner.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Building2,
  UtensilsCrossed,
  Clock,
  BookOpen,
} from 'lucide-react';

import RestaurantList from '@/components/partner/RestaurantList';
import MenuManagement from '@/components/partner/MenuManagement';
import RestaurantImages from '@/components/partner/RestaurantImages';
import TimeSlotManagement from '@/components/partner/TimeSlotManagement';
import BookingList from '@/components/partner/BookingList';
import NotificationBell from '@/components/notifications/NotificationBell';
import { getPartnerDashboardStats, type PartnerDashboardStats } from '@/lib/api';

type Section = 'dashboard' | 'restaurants' | 'menu' | 'images' | 'slots' | 'bookings';

export default function Partner() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentSection, setCurrentSection] = useState<Section>('dashboard');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('access');
    if (!token) {
      navigate('/login');
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      if (parsed.role !== 'PARTNER') {
        navigate('/');
        return;
      }
      setUser(parsed);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSelectRestaurant = (id: string) => {
    setSelectedRestaurantId(id);
  };

  const handleNavigateToMenu = (id: string) => {
    setSelectedRestaurantId(id);
    setCurrentSection('menu');
  };

  const handleNavigateToImages = (id: string) => {
    setSelectedRestaurantId(id);
    setCurrentSection('images');
  };

  const handleNavigateToSlots = (id: string) => {
    setSelectedRestaurantId(id);
    setCurrentSection('slots');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'restaurants', label: 'Nhà hàng', icon: Building2 },
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed, disabled: !selectedRestaurantId },
    { id: 'images', label: 'Ảnh', icon: Building2, disabled: !selectedRestaurantId },
    { id: 'slots', label: 'Khung giờ', icon: Clock, disabled: !selectedRestaurantId },
    { id: 'bookings', label: 'Booking', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-700 transition-transform duration-300 ${
          sidebarOpen ? 'w-64' : '-translate-x-full'
        } lg:relative lg:translate-x-0`}
      >
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white">N4</h1>
          <p className="text-slate-400 text-sm">Partner Dashboard</p>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon as any;
            const isActive = currentSection === item.id;
            const isDisabled = (item as any).disabled;

            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && setCurrentSection(item.id as Section)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : isDisabled
                    ? 'text-slate-500 cursor-not-allowed'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-slate-800/50 backdrop-blur-md border-b border-slate-700">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-slate-300 hover:text-white"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <h2 className="text-xl font-bold text-white">
              {navItems.find((item) => item.id === currentSection)?.label}
            </h2>

            <div className="flex items-center gap-4">
              <NotificationBell position="right" />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {currentSection === 'dashboard' && <Dashboard />}

            {currentSection === 'restaurants' && (
              <RestaurantList
                onSelectRestaurant={handleSelectRestaurant}
                onNavigateToMenu={handleNavigateToMenu}
                onNavigateToImages={handleNavigateToImages}
                onNavigateToSlots={handleNavigateToSlots}
              />
            )}

            {currentSection === 'menu' && selectedRestaurantId && (
              <MenuManagement restaurantId={selectedRestaurantId} />
            )}

            {currentSection === 'images' && selectedRestaurantId && (
              <RestaurantImages restaurantId={selectedRestaurantId} />
            )}

            {currentSection === 'slots' && selectedRestaurantId && (
              <TimeSlotManagement restaurantId={selectedRestaurantId} />
            )}

            {currentSection === 'bookings' && <BookingList />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState<PartnerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    const data = await getPartnerDashboardStats();
    setStats(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-orange-500/50 transition">
          <p className="text-slate-400 text-sm mb-2">Tổng nhà hàng</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : stats?.total_restaurants || 0}
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-orange-500/50 transition">
          <p className="text-slate-400 text-sm mb-2">Booking hôm nay</p>
          <p className="text-3xl font-bold text-orange-400">
            {loading ? '...' : stats?.bookings_today || 0}
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-orange-500/50 transition">
          <p className="text-slate-400 text-sm mb-2">Booking tuần</p>
          <p className="text-3xl font-bold text-blue-400">
            {loading ? '...' : stats?.bookings_this_week || 0}
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-orange-500/50 transition">
          <p className="text-slate-400 text-sm mb-2">Chờ xác nhận</p>
          <p className="text-3xl font-bold text-yellow-400">
            {loading ? '...' : stats?.bookings_pending || 0}
          </p>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Sắp diễn ra</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-300">2 giờ tới</span>
              <span className="text-xl font-bold text-orange-400">
                {loading ? '...' : stats?.upcoming_bookings_next_2h || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-300">24 giờ tới</span>
              <span className="text-xl font-bold text-blue-400">
                {loading ? '...' : stats?.upcoming_bookings_next_24h || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Khung giờ cao điểm (hôm nay)</h3>
          <div className="space-y-2">
            {loading ? (
              <p className="text-slate-400">Đang tải...</p>
            ) : stats?.peak_hours_today && stats.peak_hours_today.length > 0 ? (
              stats.peak_hours_today.map((hour: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                  <span className="text-slate-300">{hour.time}</span>
                  <div className="w-16 bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${(hour.count / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-orange-400 font-semibold text-sm ml-2">{hour.count}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-400">Không có booking</p>
            )}
          </div>
        </div>
      </div>

      {/* 7-Day Chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Booking 7 ngày gần nhất</h3>
        <div className="flex items-end gap-3 h-64 justify-between">
          {loading ? (
            <p className="text-slate-400 w-full text-center">Đang tải...</p>
          ) : stats?.bookings_7days && stats.bookings_7days.length > 0 ? (
            stats.bookings_7days.map((day: any, idx: number) => {
              const maxCount = Math.max(...stats.bookings_7days!.map((d: any) => d.count), 1);
              const heightPercent = (day.count / maxCount) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t"
                    style={{ height: `${heightPercent}%` }}
                  >
                    {day.count > 0 && (
                      <div className="text-center text-white text-sm font-bold pt-1">{day.count}</div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-slate-300 text-xs font-semibold">{day.day}</p>
                    <p className="text-slate-400 text-xs">{day.date.split('-').slice(2).join('/')}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-slate-400">Không có dữ liệu</p>
          )}
        </div>
      </div>

      {/* Welcome Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-2">Chào mừng đến Partner Dashboard</h3>
        <p className="text-slate-300">Quản lý nhà hàng, menu, booking và nhiều tính năng khác từ đây.</p>
      </div>
    </div>
  );
}
