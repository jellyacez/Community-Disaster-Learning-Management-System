import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";
import useDocumentTitle from "../../../hooks/useDocumentTitle";
import SearchBar from "../../../components/ui/inputs/SearchBar.jsx";
import EnrollCodeModal from "../../../components/ui/modals/EnrollCodeModal.jsx";
import PaginationControls from "../../../components/ui/PaginationControls.jsx";
import ModuleCard from "../../../components/ui/modules/ModuleCard.jsx";
import ModuleSkeleton from "../../../components/ui/modules/ModuleSkeleton.jsx";
import continuousLearningImg from "../../../assets/continuous-learning.svg";
import useDebounce from "../../../hooks/useDebounce";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, HelpSquareIcon } from "@hugeicons/core-free-icons";
import { decodeHtml } from "../../../utils/textUtils";
import { useOfflineSession } from "../../../hooks/offlineSession";
import noInternetIMG from "../../../assets/undraw-Question.svg";

export default function UserModuleCatalog() {
  useDocumentTitle("Module Catalog | Bacolor Disaster LMS");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session } = useOfflineSession();
  const userId = session?.user?.id;
  const cacheKey = userId ? `lms_offline_catalog_${userId}` : null;

  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [pendingEnrollModule, setPendingEnrollModule] = useState(null);
  const [showRequestConfirmModal, setShowRequestConfirmModal] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);

  const { data: rawModules = [], isLoading } = useQuery({
    queryKey: ["availableModules", userId || "guest"],
    networkMode: "offlineFirst",
    initialData: () => {
      if (!cacheKey) return undefined;
      try {
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : undefined;
      } catch {
        return undefined;
      }
    },
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      try {
        const res = await apiClient.get("/modules/available", { timeout: 8000 });
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(res.data));
        return res.data;
      } catch (err) {
        if (!err.response) {
          const cached = cacheKey ? localStorage.getItem(cacheKey) : null;
          if (cached) return JSON.parse(cached);
        }
        throw err;
      }
    },
    refetchInterval: () => (navigator.onLine ? 60000 : false),
  });

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

  const categories = useMemo(() => {
    const cats = new Set();
    modules.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats);
  }, [modules]);

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

  // Back to page 1 when the search or category changes (adjusted during render, not in an effect)
  const filterKey = `${debouncedSearch}\u0000${selectedCategory}`;
  const [pagedFilterKey, setPagedFilterKey] = useState(filterKey);
  if (filterKey !== pagedFilterKey) {
    setPagedFilterKey(filterKey);
    setCurrentPage(1);
  }

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage) || 1;
  const paginatedModules = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredModules.slice(start, start + itemsPerPage);
  }, [filteredModules, currentPage, itemsPerPage]);

  const handleEnrollSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["availableModules"] });
    queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
  };

  const handleOpenEnrollConfirm = (module) => {
    setEnrollError("");
    setPendingEnrollModule(module);
  };

  const handleCloseEnrollModal = () => {
    if (isEnrolling || isRequestingCode) return;
    setPendingEnrollModule(null);
    setShowRequestConfirmModal(false);
    setEnrollError("");
  };

  const handleConfirmEnroll = async (code) => {
    if (!pendingEnrollModule || isEnrolling) return;

    try {
      setIsEnrolling(true);
      setEnrollError("");
      const res = await apiClient.post(`/modules/${pendingEnrollModule.id}/enroll`, { code });

      if (res.data?.success || res.status === 200) {
        toast.success(`Enrollment Success! You are now enrolled in ${decodeHtml(pendingEnrollModule.title)}.`);
        handleEnrollSuccess();
        setPendingEnrollModule(null);
        navigate("/user/enrolled");
      }
    } catch (err) {
      const data = err?.response?.data;
      const codeProblems = ["INVALID_ENROLLMENT_CODE", "ENROLLMENT_CODE_REQUIRED", "TOO_MANY_ATTEMPTS"];
      if (codeProblems.includes(data?.code)) {
        setEnrollError(data.message);
      } else {
        toast.error(data?.message || "In development. Please try again.");
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleConfirmRequestCode = async () => {
    if (!pendingEnrollModule || isRequestingCode) return;

    try {
      setIsRequestingCode(true);
      const res = await apiClient.post(`/modules/${pendingEnrollModule.id}/request-code`);

      if (res.data?.success || res.status === 200) {
        toast.success("Code request sent to admin successfully!");
        setShowRequestConfirmModal(false);
        setPendingEnrollModule(null);
      }
    } catch (err) {
      const data = err?.response?.data;
      toast.error(data?.message || "In development. Please try again.");
    } finally {
      setIsRequestingCode(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Module Catalog</h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Explore training modules and enroll to build disaster preparedness knowledge.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <SearchBar
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onClear={() => setSearchInput("")}
          placeholder="Search modules by title or topic..."
          ariaLabel="Search module catalog"
          containerClassName="relative flex-1"
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[170px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <ModuleSkeleton key={i} />)}
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
          {!navigator.onLine && rawModules.length === 0 ? (
            <>
              <img src={noInternetIMG} alt="No Internet Connection" className="w-48 h-48 mb-6 opacity-80" />
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">You're Offline</h2>
              <p className="text-sm text-gray-500 max-w-sm mb-6">
                Connect to the internet to browse the module catalog.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-sm transition-all shadow-sm"
              >
                Refresh Page
              </button>
            </>
          ) : debouncedSearch || selectedCategory !== "all" ? (
            <>
              <HugeiconsIcon icon={Search01Icon} className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No matching modules found</h3>
            </>
          ) : (
            <>
              <img src={continuousLearningImg} alt="Maximum Preparedness" className="w-44 h-44 mb-5 opacity-90 drop-shadow-sm" />
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">All Caught Up!</h2>
            </>
          )}
        </div>
      )}

      <EnrollCodeModal
        isOpen={Boolean(pendingEnrollModule)}
        moduleTitle={pendingEnrollModule ? decodeHtml(pendingEnrollModule.title) : ""}
        onClose={handleCloseEnrollModal}
        onSubmit={handleConfirmEnroll}
        onRequestCode={() => setShowRequestConfirmModal(true)}
        isLoading={isEnrolling}
        isRequesting={isRequestingCode}
        error={enrollError}
        onInputChange={() => enrollError && setEnrollError("")}
      />

      {showRequestConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
              <HugeiconsIcon icon={HelpSquareIcon} className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900">Send Request to Admin?</h3>
            <p className="mt-1 text-sm text-gray-500 mb-6">
              This will notify the admin to send an enrollment code for <span className="font-semibold text-gray-700">"{pendingEnrollModule ? decodeHtml(pendingEnrollModule.title) : ""}"</span>.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowRequestConfirmModal(false)}
                disabled={isRequestingCode}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRequestCode}
                disabled={isRequestingCode}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 shadow-sm disabled:opacity-50"
              >
                {isRequestingCode ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}