import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon } from '@hugeicons/core-free-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationDropdown from './NotificationDropdown';

export default function UserNavbar({
  currentUser,
  userInitials,
  setSidebarOpen,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitles = {
    '/userDashboard': 'Homepage',
    '/user/announcements': 'Announcements',
    '/user/modules': 'Module Catalog',
    '/user/enrolled': 'Enrolled Modules',
    '/user/profile': 'User Profile',
    '/user/settings': 'Settings',
  };

  const currentTitle = pageTitles[location.pathname] || 'User Dashboard';

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar menu"
            className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 lg:hidden cursor-pointer"
          >
            <HugeiconsIcon aria-hidden="true" icon={Menu01Icon} className="w-5 h-5" />
          </button>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Resident Learning Dashboard
            </p>
            <h1 className="text-lg font-extrabold text-gray-900">{currentTitle}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationDropdown />

          <button
            onClick={() => navigate('/user/profile')}
            aria-label="User profile settings"
            className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            {currentUser?.image ? (
              <img 
                src={currentUser.image} 
                alt={`${currentUser.name}'s profile`} 
                className="h-9 w-9 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 font-bold text-red-700">
                {userInitials}
              </div>
            )}
            
            <div className="hidden text-left sm:block">
              <p className="text-sm font-bold text-gray-900">{currentUser.name}</p>
              <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}