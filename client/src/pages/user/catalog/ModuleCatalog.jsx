import { useState, useMemo, useEffect } from "react";
import ModuleCard from "../../../components/ui/modules/ModuleCard.jsx";
import ModuleSkeleton from "../../../components/ui/modules/ModuleSkeleton.jsx";
import useDocumentTitle from "../../../hooks/useDocumentTitle";
import SearchBar from "../../../components/ui/inputs/SearchBar.jsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";
import continuousLearningImg from "../../../assets/continuous-learning.svg";
import useDebounce from "../../../hooks/useDebounce";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Search01Icon,
  Book02Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { decodeHtml } from "../../../utils/textUtils";

export default function UserModuleCatalog() {
  useDocumentTitle("Module Catalog | Bacolor LMS");
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Confirmation Modal State
  const [pendingEnrollModule, setPendingEnrollModule] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  const debouncedSearch = useDebounce(searchInput, 350);

  const { data: rawModules = [], isLoading } = useQuery({
    queryKey: ["availableModules"],
    queryFn: async () => {
      const res = await apiClient.get("/modules/available");
      return res.data;
    },
    refetchInterval: 60000,
  });

  // Normalize dataset to standardize fields across components
  const modules = useMemo(() => {
    return rawModules.map((mod) => ({
      ...mod,
      id: mod.id || mod.mod_id,
      title: decodeHtml(mod.title || mod.modname) || "Untitled Module",
      category: mod.category || mod.modcat || "General",
      level: mod.level || "Level 1",
      duration: mod.duration || "Varies",
      image_url: mod.image_url || null,
      progress: parseInt(mod.progress || 0),
      status: mod.enrollment_status || "Not Started",
      is_enrolled: mod.is_enrolled || false,
    }));
  }, [rawModules]);

  // Extract unique categories for dropdown
  const categories = useMemo(() => {
    const cats = new Set();
    modules.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats);
  }, [modules]);

  // Filter modules
  const filteredModules = useMemo(() => {
    let result = modules.filter((mod) => !mod.is_enrolled);

    if (selectedCategory !== "all") {
      result = result.filter(
        (mod) => mod.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (debouncedSearch) {
      const lowerQuery = debouncedSearch.toLowerCase();
      result = result.filter(
        (mod) =>
          mod.title?.toLowerCase().includes(lowerQuery) ||
          mod.category?.toLowerCase().includes(lowerQuery)
      );
    }
    return result;
  }, [modules, selectedCategory, debouncedSearch]);

  // Reset pagination on search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCategory]);

  // Paginate filtered items
  const totalPages = Math.ceil(filteredModules.length / itemsPerPage) || 1;
  const paginatedModules = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredModules.slice(start, start + itemsPerPage);
  }, [filteredModules, currentPage, itemsPerPage]);

  const handleEnrollSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["availableModules"] });
    queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
  };

  // Open confirmation modal
  const handleOpenEnrollConfirm = (module) => {
    setEnrollError("");
    setPendingEnrollModule(module);
  };

  // Process enrollment upon user confirmation
  const handleConfirmEnroll = async () => {
    if (!pendingEnrollModule) return;

    try {
      setIsEnrolling(true);
      setEnrollError("");
      await apiClient.post(`/modules/${pendingEnrollModule.id}/enroll`);
      
      handleEnrollSuccess();
      setPendingEnrollModule(null);
    } catch (err) {
      setEnrollError(
        err?.response?.data?.message ||
          "Failed to enroll in the module. Please try again."
      );
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Module Catalog
        </h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Explore training modules and enroll to build disaster preparedness knowledge.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <SearchBar
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onClear={() => setSearchInput("")}
          placeholder="Search modules by title or topic..."
          ariaLabel="Search module catalog"
          containerClassName="relative flex-1"
        />

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[170px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <ModuleSkeleton key={i} />
          ))}
        </div>
      ) : filteredModules.length > 0 ? (
        <div className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-2">
            {paginatedModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                enrolled={module.is_enrolled}
                onEnrollClick={() => handleOpenEnrollConfirm(module)}
                onEnrollSuccess={handleEnrollSuccess}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {filteredModules.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 font-medium">
                Showing{" "}
                <span className="font-bold text-gray-700">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-gray-700">
                  {Math.min(currentPage * itemsPerPage, filteredModules.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-gray-700">
                  {filteredModules.length}
                </span>{" "}
                modules
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
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
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-gray-200 shadow-sm">
          {debouncedSearch || selectedCategory !== "all" ? (
            <>
              <HugeiconsIcon
                icon={Search01Icon}
                className="w-12 h-12 text-gray-300 mb-4"
              />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No matching modules found
              </h3>
              <p className="text-gray-500 text-sm max-w-sm">
                Try adjusting your search query or category filter to discover
                other available training modules.
              </p>
            </>
          ) : (
            <>
              <img
                src={continuousLearningImg}
                alt="No modules mascot"
                className="w-48 h-48 mb-6 opacity-80"
              />
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                All Caught Up!
              </h2>
              <p className="text-sm text-gray-500 max-w-xs">
                You have explored or enrolled in all available modules. Check back
                later for new disaster risk reduction courses!
              </p>
            </>
          )}
        </div>
      )}

      {/* Enrollment Confirmation Modal */}
      {pendingEnrollModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <HugeiconsIcon icon={Book02Icon} className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-gray-900">
                  Confirm Module Enrollment
                </h3>
                <p className="text-xs text-gray-500">
                  Are you sure you want to enroll in this training module?
                </p>
              </div>
            </div>

            {/* Target Module Preview */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                {pendingEnrollModule.category} • {pendingEnrollModule.level}
              </span>
              <p className="text-sm font-bold text-gray-800 line-clamp-2">
                {pendingEnrollModule.title}
              </p>
              <span className="text-xs text-gray-500 block">
                Estimated Duration: {pendingEnrollModule.duration}
              </span>
            </div>

            {/* Error Message if API fails */}
            {enrollError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isEnrolling}
                onClick={() => setPendingEnrollModule(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isEnrolling}
                onClick={handleConfirmEnroll}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isEnrolling ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  "Confirm & Enroll"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}