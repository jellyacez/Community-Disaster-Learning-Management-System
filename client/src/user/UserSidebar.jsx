import React from 'react';
import {
  Home,
  Megaphone,
  BookOpen,
  BadgeCheck,
  User,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function UserSidebar({
  currentUser,
  onLogout,
  sidebarOpen,
  setSidebarOpen,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/userDashboard', label: 'Homepage', icon: <Home className="w-5 h-5" /> },
    { path: '/user/announcements', label: 'Announcements', icon: <Megaphone className="w-5 h-5" /> },
    { path: '/user/modules', label: 'Module Catalog', icon: <BookOpen className="w-5 h-5" /> },
    { path: '/user/enrolled', label: 'Enrolled Modules', icon: <BadgeCheck className="w-5 h-5" /> },
    { path: '/user/profile', label: 'User Profile', icon: <User className="w-5 h-5" /> },
    { path: '/user/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-600 p-2.5 text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Bacolor LMS
            </p>
            <h2 className="text-lg font-extrabold text-gray-900">User Portal</h2>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="border-b border-gray-200 px-6 py-5">
        <p className="text-sm font-bold text-gray-900">{currentUser.name}</p>
        <p className="text-sm text-gray-500">{currentUser.email}</p>
        <p className="mt-2 inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
          {currentUser.role}
        </p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {navItems.map((item) => {
          const active = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${
                active
                  ? 'bg-red-600 text-white shadow'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-3 font-semibold">
                {item.icon}
                {item.label}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}