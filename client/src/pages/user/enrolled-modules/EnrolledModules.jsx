import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";
import educationImg from "../../../assets/education.svg";
import ModuleCard from "../../../components/ui/modules/ModuleCard.jsx";
import ModuleSkeleton from "../../../components/ui/modules/ModuleSkeleton.jsx";
import useDocumentTitle from "../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  CheckmarkCircle02Icon,
  Activity01Icon,
  Book01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import SearchBar from "../../../components/ui/inputs/SearchBar.jsx";
import useDebounce from "../../../hooks/useDebounce";

export default function UserEnrolledModules() {
  useDocumentTitle("Enrolled Modules | Bacolor LMS");
  
  const [searchInput, setSearchInput] = useState("");
  const [activeTab, setActiveTab] = useState("in_progress");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const debouncedSearch = useDebounce(searchInput, 350);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['userDashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/user/dashboard');
      return response.data;
    },
    refetchInterval: 30000, // Background polling every 30s
  });

  // Normalize dataset
  const enrolledModules = useMemo(() => {
    const rawModules = dashboardData?.enrolledModules 
      ? dashboardData.enrolledModules 
      : dashboardData?.data?.enrolledModules 
        ? dashboardData.data.enrolledModules 
        : [];

    return rawModules.map((mod) => ({
      ...mod,
      id: mod.id || mod.mod_id,
      title: mod.title || mod.modname || "Untitled Module",
      category: mod.category || mod.modcat || "General",
      level: mod.level || "Level 1",
      duration: mod.duration || "Varies",
      image_url: mod.image_url || null,
      progress: parseInt(mod.progress || 0),
      status: mod.enrollment_status || "Not Started",
    }));
  }, [dashboardData]);

  // Extract categories
  const categories = useMemo(() => {
    const cats = new Set();
    enrolledModules.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats);
  }, [enrolledModules]);

  const inProgressCount = useMemo(() => {
    return enrolledModules.filter((m) => m.status !== "Completed" && m.progress < 100).length;
  }, [enrolledModules]);

  const completedCount = useMemo(() => {
    return enrolledModules.filter((m) => m.status === "Completed" || m.progress === 100).length;
  }, [enrolledModules]);

  // Filter modules
  const filteredModules = useMemo(() => {
    let list = enrolledModules;

    if (activeTab === "in_progress") {
      list = list.filter((m) => m.status !== "Completed" && m.progress < 100);
    } else if (activeTab === "completed") {
      list = list.filter((m) => m.status === "Completed" || m.progress === 100);
    }

    if (selectedCategory !== "all") {
      list = list.filter((m) => m.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter((m) =>
        m.title?.toLowerCase().includes(lower) ||
        m.category?.toLowerCase().includes(lower)
      );
    }

    return list;
  }, [enrolledModules, activeTab, selectedCategory, debouncedSearch]);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTab, selectedCategory]);

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage) || 1;
  const paginatedModules = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredModules.slice(start, start + itemsPerPage);
  }, [filteredModules, currentPage, itemsPerPage]);

  const tabs = [
    { key: "in_progress", label: "In Progress", count: inProgressCount, icon: Activity01Icon },
    { key: "completed", label: "Completed", count: completedCount, icon: CheckmarkCircle02Icon },
    { key: "all", label: "All Enrolled", count: enrolledModules.length, icon: Book01Icon },
  ];

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Enrolled Modules
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Keep track of your training progress and resume courses where you left off.
          </p>
        </div>
        <Link
          to="/user/modules"
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <HugeiconsIcon icon={Book01Icon} className="w-4 h-4" />
          <span>Explore Catalog</span>
        </Link>
      </div>

      {/* Unified Organized Controls Bar */}
      {enrolledModules.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSearchInput(""); }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <HugeiconsIcon icon={tab.icon} className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search + Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 md:justify-end">
            <SearchBar
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onClear={() => setSearchInput("")}
              placeholder="Search enrolled modules..."
              ariaLabel="Search enrolled modules"
              containerClassName="relative w-full sm:w-72"
            />

            {categories.length > 1 && (
              <div className="relative min-w-[150px]">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full py-2 pl-3 pr-8 text-xs font-medium bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Module Content Grid */}
      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <ModuleSkeleton key={i} />
          ))}
        </div>
      ) : enrolledModules.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-sm">
          <img 
            src={educationImg} 
            alt="Education Mascot" 
            className="w-56 h-56 mb-6 opacity-90 drop-shadow-sm transition-transform hover:-translate-y-2 duration-500 ease-out" 
          />
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
            No Enrolled Modules Yet
          </h2>
          <p className="text-gray-500 mb-6 max-w-md text-sm">
            You have not enrolled in any training modules yet. Enroll today to start learning disaster response principles and earn recognized certifications.
          </p>
          <Link
            to="/user/modules"
            className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-sm hover:-translate-y-0.5 transition-all duration-300"
          >
            Browse Module Catalog
          </Link>
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-gray-200 shadow-sm">
          {debouncedSearch || selectedCategory !== "all" ? (
            <>
              <HugeiconsIcon icon={Search01Icon} className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No matching modules found</h3>
              <p className="text-gray-500 text-sm max-w-sm">We couldn&apos;t find any enrolled modules matching your search filters.</p>
            </>
          ) : activeTab === "completed" ? (
            <>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No completed modules yet</h3>
              <p className="text-gray-500 max-w-sm text-sm">Keep going! Finish your in-progress modules to see them here.</p>
            </>
          ) : (
            <>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-500 max-w-sm text-sm mb-4">You have completed all your enrolled modules. Browse the catalog for new training opportunities.</p>
              <Link
                to="/user/modules"
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
              >
                Browse Module Catalog
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-2">
            {paginatedModules.map((module) => (
              <ModuleCard key={module.id} module={module} enrolled={true} />
            ))}
          </div>

          {/* Pagination Controls */}
          {filteredModules.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="font-bold text-gray-700">
                  {Math.min(currentPage * itemsPerPage, filteredModules.length)}
                </span>{" "}
                of <span className="font-bold text-gray-700">{filteredModules.length}</span> modules
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5" />
                  Previous
                </button>
                <span className="text-xs font-medium text-gray-600 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                >
                  Next
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}