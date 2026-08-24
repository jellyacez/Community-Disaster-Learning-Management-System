import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon } from '@hugeicons/core-free-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationDropdown from './NotificationDropdown';
import UnsyncedQueueIndicator from '../ui/UnsyncedQueueIndicator';

export default function UserNavbar({
  currentUser,
  userInitials,
  setSidebarOpen,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = (pathname) => {
    if (pathname === '/userDashboard') return 'Homepage';
    if (pathname.startsWith('/user/announcements')) return 'Announcements';
    if (pathname.startsWith('/user/enrolled')) return 'Enrolled Modules';
    if (pathname.startsWith('/user/certificates/view')) return 'Certificate Viewer';
    if (pathname.startsWith('/user/certificates')) return 'My Certificates';
    if (pathname.startsWith('/user/feedback')) return 'Feedback & Support';
    if (pathname.startsWith('/user/modules/') && pathname.endsWith('/details')) return 'Module Details';
    if (pathname.startsWith('/user/modules')) return 'Module Catalog';
    if (pathname.startsWith('/user/profile')) return 'User Profile';
    if (pathname.startsWith('/user/settings')) return 'Settings';
    return 'Resident Portal';
  };

  const currentTitle = getPageTitle(location.pathname);

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
          <UnsyncedQueueIndicator />
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