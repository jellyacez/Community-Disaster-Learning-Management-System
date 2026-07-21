import { useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import LogoutModal from "../ui/modals/LogoutModal";
import {
  Home01Icon,
  Megaphone01Icon,
  BookOpen01Icon,
  Certificate01Icon,
  UserIcon,
  Settings01Icon,
  Logout01Icon,
  ArrowRight01Icon,
  Shield01Icon,
  Cancel01Icon,
  Certificate02Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient } from "../../lib/auth-client";
import toast from "react-hot-toast";

const navItems = [
  {
    path: "/userDashboard",
    label: "Homepage",
    icon: <HugeiconsIcon aria-hidden="true" icon={Home01Icon} className="w-5 h-5" />,
  },
  {
    path: "/user/announcements",
    label: "Announcements",
    icon: <HugeiconsIcon aria-hidden="true" icon={Megaphone01Icon} className="w-5 h-5" />,
  },
  {
    path: "/user/modules",
    label: "Module Catalog",
    icon: <HugeiconsIcon aria-hidden="true" icon={BookOpen01Icon} className="w-5 h-5" />,
  },
  {
    path: "/user/enrolled",
    label: "Enrolled Modules",
    icon: <HugeiconsIcon aria-hidden="true" icon={Certificate01Icon} className="w-5 h-5" />,
  },
  {
    path: "/user/certificates",
    label: "My Certificates",
    icon: <HugeiconsIcon aria-hidden="true" icon={Certificate02Icon} className="w-5 h-5" />,
  },
{
      path: "/user/feedback",
      label: "Feedback",
      icon: (
        <HugeiconsIcon
          aria-hidden="true" icon={Message01Icon} className="w-5 h-5" />
      ),
    },
  {
    path: "/user/profile",
    label: "User Profile",
    icon: <HugeiconsIcon aria-hidden="true" icon={UserIcon} className="w-5 h-5" />,
  },
  {
    path: "/user/settings",
    label: "Settings",
    icon: <HugeiconsIcon aria-hidden="true" icon={Settings01Icon} className="w-5 h-5" />,
  },
];

export default function UserSidebar({
  currentUser,
  sidebarOpen,
  setSidebarOpen,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const itemRefs = useRef([]);
  const [pillStyle, setPillStyle] = useState({ transform: 'translateY(0px)', height: '48px', opacity: 0 });

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const confirmLogout = async () => {
    try {
      sessionStorage.setItem("isLoggingOut", "true");
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            navigate("/signin");
          },
        },
      });
      toast.success("Successfully logged out!");
    } catch {
      toast.error("Logout failed");
    } finally {
      setIsLogoutModalOpen(false);
    }
  };


  useEffect(() => {
    const updatePillPosition = () => {
      const activeIndex = navItems.findIndex(item => 
        location.pathname === item.path || location.pathname.startsWith(item.path + '/')
      );
      
      if (activeIndex !== -1 && itemRefs.current[activeIndex]) {
        const activeEl = itemRefs.current[activeIndex];
        setPillStyle({
          transform: `translateY(${activeEl.offsetTop}px)`,
          height: `${activeEl.offsetHeight}px`,
          opacity: 1
        });
      } else {
        setPillStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updatePillPosition();
    window.addEventListener('resize', updatePillPosition);
    
    // Give a tiny delay for first paint font rendering
    const timeoutId = setTimeout(updatePillPosition, 50);
    
    return () => {
      window.removeEventListener('resize', updatePillPosition);
      clearTimeout(timeoutId);
    };
  }, [location.pathname]);

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-600 p-2.5 text-white">
              <HugeiconsIcon
                aria-hidden="true"
                icon={Shield01Icon}
                className="w-5 h-5"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Bacolor LMS
              </p>
              <h2 className="text-lg font-extrabold text-gray-900">
                User Portal
              </h2>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar menu"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden cursor-pointer"
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={Cancel01Icon}
              className="w-5 h-5"
            />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 py-5">
          <p className="text-sm font-bold text-gray-900">{currentUser.name}</p>
          <p className="text-sm text-gray-500">{currentUser.email}</p>
          <p className="mt-2 inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
            {currentUser.role}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5 relative flex flex-col gap-2">
          <div
            className="hidden lg:block absolute left-4 right-4 top-0 rounded-xl bg-red-600 shadow-md transition-all duration-300 ease-out z-0"
            style={pillStyle}
          />

          {navItems.map((item, index) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

            return (
              <button
                key={item.path}
                ref={(el) => (itemRefs.current[index] = el)}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`relative flex w-full min-h-[3rem] py-2 items-center justify-between rounded-xl px-4 text-left transition-colors z-10 cursor-pointer ${
                  active
                    ? "bg-red-600 lg:bg-transparent shadow-md lg:shadow-none text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="relative z-10 flex items-center gap-3 font-semibold">
                  {item.icon}
                  {item.label}
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className={`relative z-10 w-4 h-4 ${
                    active ? "text-white" : "text-gray-500"
                  }`}
                />
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={Logout01Icon}
              className="w-5 h-5"
            />
            Logout
          </button>
        </div>
      </aside>
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}
