import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon } from '@hugeicons/core-free-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationDropdown from './NotificationDropdown';
import UnsyncedQueueIndicator from '../ui/UnsyncedQueueIndicator';
import ThemeToggle from '../ui/globalTheme';

export default function UserNavbar({
  currentUser,
  userInitials,
  setSidebarOpen,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = (pathname) => {
    if (pathname === '/userDashboard') return 'Dashboard';
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
    <header className="sticky top-0 z-30 border-b border-gray-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur transition-colors duration-200">
      <div className="flex items-center justify-between px-3 sm:px-6 lg:px-8 py-3 sm:py-4 gap-2">

        {/* Left Section: Menu Toggle & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar menu"
            className="shrink-0 rounded-xl border border-gray-200 dark:border-slate-800 p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900 lg:hidden cursor-pointer transition-all active:scale-95"
          >
            <HugeiconsIcon aria-hidden="true" icon={Menu01Icon} className="w-5 h-5 shrink-0" />
          </button>

          <div className="min-w-0 flex flex-col">
            {/* Desktop: Static Branding | Mobile: Dynamic Page Title */}
            <p className="hidden sm:block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400 truncate">
              Resident Learning Dashboard
            </p>
            <p className="sm:hidden text-sm font-black text-gray-900 dark:text-slate-100 truncate">
              {currentTitle}
            </p>
          </div>
        </div>

        {/* Right Section: Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <UnsyncedQueueIndicator />
          <NotificationDropdown />
          <ThemeToggle />

          {/* Divider visible only on larger screens */}
          <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-slate-800 mx-1" />

          {/* User Profile Button */}
          <button
            onClick={() => navigate('/user/profile')}
            aria-label="User profile settings"
            className="flex items-center gap-2.5 sm:gap-3 rounded-full sm:rounded-xl border border-transparent sm:border-gray-200 dark:sm:border-slate-800 bg-transparent dark:sm:bg-slate-900/60 p-0.5 sm:px-3 sm:py-2 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            {currentUser?.image ? (
              <img
                src={currentUser.image}
                alt={`${currentUser.name}'s profile`}
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-full object-cover border border-gray-200 dark:border-slate-700"
              />
            ) : (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/70 font-bold text-[11px] sm:text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                {userInitials}
              </div>
            )}

            <div className="hidden text-left md:block min-w-0 max-w-[130px]">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {currentUser?.name || "Resident"}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 capitalize truncate leading-tight">
                {currentUser?.role?.replace(/_/g, " ") || "User"}
              </p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
