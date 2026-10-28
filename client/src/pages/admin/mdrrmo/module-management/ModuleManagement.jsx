import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ModuleBuilderWizard from "./builders/ModuleBuilderWizard";
import DashboardHeader from "./components/DashboardHeader";
import ModuleGrid from "./components/ModuleGrid";
import apiClient from "../../../../lib/apiClient";
import { authClient } from "../../../../lib/auth-client";
import { useModuleBuilder } from "../../../../hooks/useModuleBuilder";
import useDebounce from "../../../../hooks/useDebounce";
import { decodeHtml } from "../../../../utils/textUtils";

const ITEMS_PER_PAGE = 6;

// Dropdown values -> API filters (filtering and sorting happen on the server)
const STATUS_PARAM = {
  All: "not_archived",
  Published: "published",
  Drafts: "draft",
  "Pending Review": "pending_review",
  Archived: "archived",
};
const SORT_PARAM = {
  "Needs revision first": "needs_revision",
  "Recently edited": "newest",
};

const fetchModules = async ({ page, search, category, level, status, sort }) => {
  const res = await apiClient.get("/admin/modules", {
    params: {
      page,
      limit: ITEMS_PER_PAGE,
      search: search || undefined,
      category: category === "All" ? undefined : category,
      level: level === "All" ? undefined : level,
      status: STATUS_PARAM[status],
      sort: SORT_PARAM[sort],
    },
  });
  const data = res.data.data || [];
  const rows = data.map((mod) => ({
    id: mod.mod_id,
    title: decodeHtml(mod.modname),
    category: mod.modcat,
    status: mod.status,
    step_count: parseInt(mod.step_count, 10) || 0,
    description: mod.description || "",
    level: mod.level || "Level 1",
    duration: mod.duration || "Varies",
    image_url: mod.image_url || null,
    rejection_reason: mod.rejection_reason || null,
    author_id: mod.author_id || null,
    parent_mod_id: mod.parent_mod_id || null,
    has_active_draft: mod.has_active_draft || false,
  }));
  return { rows, total: res.data.meta?.total ?? 0 };
};

export default function ModuleManagement() {
  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role;

  const canCreateModule = userRole === "mdrrmo_admin" || userRole === "super_admin";

  const { state, setters, actions } = useModuleBuilder();
  const { triggerFlowSequencePreview, loadModuleForEdit, resetForm } = actions;

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Dashboard UI State
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOption, setSortOption] = useState("Needs revision first");
  const [currentPage, setCurrentPage] = useState(1);

  const filters = {
    page: currentPage,
    search: debouncedSearchQuery.trim(),
    category: filterCategory,
    level: filterLevel,
    status: filterStatus,
    sort: sortOption,
  };
  const { data, isLoading, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: ["adminModules", "management", filters],
    queryFn: () => fetchModules(filters),
    // Keep the current cards on screen while the next page or filter loads
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const paginatedModules = data?.rows ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / ITEMS_PER_PAGE);

  // Archiving or deleting the last module on the last page leaves that page empty;
  // step back to the new last page instead of showing "no matches" (adjusted during render, not in an effect)
  if (data && !isPlaceholderData && data.rows.length === 0 && currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }
  // "No learning paths yet" only when the unfiltered library is empty, not when filters hide everything
  const hasActiveFilters =
    filters.search !== "" || filterCategory !== "All" || filterLevel !== "All" || filterStatus !== "All";
  const isLibraryEmpty = !hasActiveFilters && (data?.total ?? 0) === 0;

  const handleOpenWizard = () => {
    if (!canCreateModule) {
      toast.error("Access Denied: Insufficient Authority Level");
      return;
    }
    resetForm();
    setIsWizardOpen(true);
  };

  const handleEditModule = async (moduleId) => {
    if (!canCreateModule) {
      toast.error("Access Denied: Insufficient Authority Level");
      return;
    }
    resetForm();
    setIsWizardOpen(true);
    if (loadModuleForEdit) {
      await loadModuleForEdit(moduleId);
    }
  };

  return (
    <>
      <div id="training-modules-top" className="max-w-7xl mx-auto animate-in fade-in duration-150 px-6 md:px-12 pt-2 md:pt-2 pb-12">
        <DashboardHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setCurrentPage={setCurrentPage}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterLevel={filterLevel}
          setFilterLevel={setFilterLevel}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          sortOption={sortOption}
          setSortOption={setSortOption}
          handleOpenWizard={handleOpenWizard}
        />

        <ModuleGrid
          isLoading={isLoading}
          isError={isError}
          isLibraryEmpty={isLibraryEmpty}
          isRefreshing={isPlaceholderData}
          paginatedModules={paginatedModules}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          handleOpenWizard={handleOpenWizard}
          handleEditModule={handleEditModule}
          setSearchQuery={setSearchQuery}
          setFilterCategory={setFilterCategory}
          setFilterLevel={setFilterLevel}
          setFilterStatus={setFilterStatus}
        />
      </div>

      {canCreateModule && (
        <ModuleBuilderWizard
          isOpen={isWizardOpen}
          onClose={() => {
            setIsWizardOpen(false);
            resetForm();
          }}
          state={state}
          setters={setters}
          actions={actions}
          refetchModules={refetch}
          triggerFlowSequencePreview={triggerFlowSequencePreview}
          showPreviewModal={showPreviewModal}
          setShowPreviewModal={setShowPreviewModal}
        />
      )}
    </>
  );
}