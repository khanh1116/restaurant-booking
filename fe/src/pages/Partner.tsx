// src/pages/Partner.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Building2, UtensilsCrossed, Clock, BookOpen } from 'lucide-react';
import RestaurantList from '@/components/partner/RestaurantList';
import RestaurantForm from '@/components/partner/RestaurantForm';
import MenuManagement from '@/components/partner/MenuManagement';
import RestaurantImages from '@/components/partner/RestaurantImages';
import TimeSlotManagement from '@/components/partner/TimeSlotManagement';
import BookingList from '@/components/partner/BookingList';
import NotificationBell from '@/components/notifications/NotificationBell';
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
          <h1 className="text-2xl font-bold text-white">RestroHub</h1>
          <p className="text-slate-400 text-sm">Partner Dashboard</p>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            const isDisabled = item.disabled;

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
              
              {/* 🔥 THÊM NOTIFICATION BELL Ở ĐÂY */}
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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <p className="text-slate-400 text-sm mb-2">Tổng nhà hàng</p>
          <p className="text-3xl font-bold text-white">-</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <p className="text-slate-400 text-sm mb-2">Booking hôm nay</p>
          <p className="text-3xl font-bold text-white">-</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <p className="text-slate-400 text-sm mb-2">Booking tuần</p>
          <p className="text-3xl font-bold text-white">-</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <p className="text-slate-400 text-sm mb-2">Menu items</p>
          <p className="text-3xl font-bold text-white">-</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Chào mừng đến Partner Dashboard</h3>
        <p className="text-slate-300">
          Quản lý nhà hàng, menu, booking và nhiều tính năng khác từ đây.
        </p>
      </div>
    </div>
  );
}