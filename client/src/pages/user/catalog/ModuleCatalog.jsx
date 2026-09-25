import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ModuleCard from "../../../components/ui/modules/ModuleCard.jsx";
import ModuleSkeleton from "../../../components/ui/modules/ModuleSkeleton.jsx";
import useDocumentTitle from "../../../hooks/useDocumentTitle";
import SearchBar from "../../../components/ui/inputs/SearchBar.jsx";
import ConfirmationModal from "../../../components/ui/modals/ConfirmationModal.jsx";
import PaginationControls from "../../../components/ui/PaginationControls.jsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";
import continuousLearningImg from "../../../assets/continuous-learning.svg";
import useDebounce from "../../../hooks/useDebounce";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Book02Icon,
} from "@hugeicons/core-free-icons";
import { decodeHtml } from "../../../utils/textUtils";

export default function UserModuleCatalog() {
  useDocumentTitle("Module Catalog | Bacolor LMS");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Confirmation Modal State
  const [pendingEnrollModule, setPendingEnrollModule] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

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
    setPendingEnrollModule(module);
  };

  // Process enrollment upon user confirmation
  const handleConfirmEnroll = async () => {
    if (!pendingEnrollModule || isEnrolling) return;

    try {
      setIsEnrolling(true);
      const res = await apiClient.post(`/modules/${pendingEnrollModule.id}/enroll`);
      if (res.data?.success || res.status === 200) {
        toast.success(
          `Enrollment Success! You are now enrolled in ${decodeHtml(pendingEnrollModule.title)}.`
        );
        handleEnrollSuccess();
        setPendingEnrollModule(null);
        navigate("/user/enrolled");
      }
    } catch (err) {
      toast.error(
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
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredModules.length}
            itemsPerPage={itemsPerPage}
            itemName="modules"
          />
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

      {/* Preexisting Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(pendingEnrollModule)}
        onClose={() => !isEnrolling && setPendingEnrollModule(null)}
        onConfirm={handleConfirmEnroll}
        title="Confirm Module Enrollment"
        description={
          pendingEnrollModule
            ? `Are you sure you want to enroll in "${decodeHtml(pendingEnrollModule.title)}"? You can start learning immediately.`
            : ""
        }
        confirmText="Confirm & Enroll"
        cancelText="Cancel"
        type="primary"
        icon={Book02Icon}
        isLoading={isEnrolling}
      />
    </div>
  );
}