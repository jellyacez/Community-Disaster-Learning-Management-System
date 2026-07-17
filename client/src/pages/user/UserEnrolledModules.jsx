// --- START: UserEnrolledModules.jsx ---
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import educationImg from "../../assets/education.svg";
import ModuleCard from "../../components/ui/modules/ModuleCard.jsx";
import ModuleSkeleton from "../../components/ui/modules/ModuleSkeleton.jsx";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, CheckmarkCircle02Icon, Activity01Icon } from "@hugeicons/core-free-icons";
import SearchBar from "../../components/ui/inputs/SearchBar.jsx";

export default function UserEnrolledModules() {
  useDocumentTitle("Enrolled Modules | Bacolor LMS");
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['userDashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/user/dashboard');
      return response.data;
    }
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("in_progress");

  // FIX: Normalize database columns into standard object properties expected by ModuleCard
  const enrolledModules = useMemo(() => {
    const rawModules = dashboardData?.enrolledModules || [];
    return rawModules.map(mod => ({
      ...mod,
      id: mod.id || mod.mod_id,                        // Maps mod_id safely to id
      title: mod.title || mod.modname || "Untitled Module", // Maps modname safely to title
      category: mod.category || mod.modcat || "General",  // Maps modcat safely to category
      level: mod.level || "Level 1",
      duration: mod.duration || "Varies",
      image_url: mod.image_url || null,
      progress: parseInt(mod.progress || 0),
      status: mod.status || "Not Started"
    }));
  }, [dashboardData?.enrolledModules]);
  
  const inProgressModules = useMemo(() => 
    enrolledModules.filter((m) => m.status !== "Completed" && m.progress < 100),
    [enrolledModules]
  );

  const completedModules = useMemo(() => 
    enrolledModules.filter((m) => m.status === "Completed" || m.progress === 100),
    [enrolledModules]
  );

  const activeModules = activeTab === "in_progress" ? inProgressModules : completedModules;

  const filteredModules = useMemo(() => {
    if (!searchTerm) return activeModules;
    const lower = searchTerm.toLowerCase();
    return activeModules.filter((module) =>
      module.title?.toLowerCase().includes(lower) ||
      module.category?.toLowerCase().includes(lower)
    );
  }, [activeModules, searchTerm]);

  const tabs = [
    { key: "in_progress", label: "In Progress", count: inProgressModules.length, icon: Activity01Icon },
    { key: "completed", label: "Completed", count: completedModules.length, icon: CheckmarkCircle02Icon },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Enrolled Modules
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Keep track of your current learning progress and continue training.
            </p>
          </div>

          {enrolledModules.length > 0 && (
            <SearchBar
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your enrolled modules..."
            />
          )}
        </div>

        {/* Tabs Grid Navigation */}
        {enrolledModules.length > 0 && (
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSearchTerm(""); }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors duration-200 cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <HugeiconsIcon icon={tab.icon} className="w-4 h-4" />
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  activeTab === tab.key 
                    ? "bg-white/20 text-white" 
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <ModuleSkeleton key={i} />
            ))}
          </div>
        ) : enrolledModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-12 mb-12 p-8 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
            <img 
              src={educationImg} 
              alt="Education Mascot" 
              className="w-64 h-64 mb-6 opacity-90 drop-shadow-sm transition-transform hover:-translate-y-3 duration-500 ease-out" 
            />
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              No Enrolled Modules Yet!
            </h2>
            <p className="text-gray-500 mb-8 max-w-md">
              It looks like you haven't enrolled in any training modules. Start your learning journey today and be prepared!
            </p>
            <Link
              to="/user/modules"
              className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl hover:-translate-y-0.5 transition-all duration-300"
            >
              Browse Module Catalog
            </Link>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-8 py-16 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
            {searchTerm ? (
              <>
                <HugeiconsIcon icon={Search01Icon} className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No matches found</h3>
                <p className="text-gray-500">We couldn't find any enrolled modules matching "{searchTerm}"</p>
              </>
            ) : activeTab === "completed" ? (
              <>
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No completed modules yet</h3>
                <p className="text-gray-500 max-w-sm">Keep going! Finish your in-progress modules to see them here.</p>
              </>
            ) : (
              <>
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-12 h-12 text-green-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-500 max-w-sm">You've completed all your enrolled modules. Browse the catalog for more training!</p>
                <Link
                  to="/user/modules"
                  className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all duration-300"
                >
                  Browse Module Catalog
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredModules.map((module) => (
              <ModuleCard key={module.id} module={module} enrolled={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// --- END: UserEnrolledModules.jsx ---