import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ModuleBuilderWizard from "./builders/ModuleBuilderWizard";
import DashboardHeader from "./components/DashboardHeader";
import ModuleGrid from "./components/ModuleGrid";
import apiClient from "../../../../lib/apiClient";
import { useModuleBuilder } from "../../../../hooks/useModuleBuilder";
import useDebounce from "../../../../hooks/useDebounce";

const fetchModules = async () => {
  const res = await apiClient.get("/admin/modules?limit=1000"); 
  const data = res.data.data || [];
  return data.map((mod) => ({
    id: mod.mod_id,
    title: mod.modname,
    category: mod.modcat,
    status: mod.status,
    step_count: parseInt(mod.step_count, 10) || 0,
    description: mod.description || "",
    level: mod.level || "Level 1",
    duration: mod.duration || "Varies",
    image_url: mod.image_url || null,
    rejection_reason: mod.rejection_reason || null,
    author_id: mod.author_id || null,
  }));
};

export default function ModuleManagement() {
  const { data: rawModules = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["adminModules", "management"],
    queryFn: fetchModules,
    retry: 1
  });

  const { state, setters, actions } = useModuleBuilder();
  const { triggerFlowSequencePreview } = actions;

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Dashboard UI State
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All"); // All, Published, Drafts, Pending Review
  const [sortOption, setSortOption] = useState("Needs revision first");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredModules = useMemo(() => {
    return rawModules.filter(mod => {
      const matchesSearch = mod.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesCat = filterCategory === "All" || mod.category === filterCategory;
      const matchesLevel = filterLevel === "All" || mod.level === filterLevel;
      
      let matchesStatus = true;
      if (filterStatus === "Published") matchesStatus = mod.status === "published";
      if (filterStatus === "Drafts") matchesStatus = mod.status === "draft";
      if (filterStatus === "Pending Review") matchesStatus = mod.status === "pending_review";

      return matchesSearch && matchesCat && matchesLevel && matchesStatus;
    }).sort((a, b) => {
      // Sort logic
      const aIsRejected = a.status === 'draft' && !!a.rejection_reason;
      const bIsRejected = b.status === 'draft' && !!b.rejection_reason;

      if (sortOption === "Needs revision first") {
        if (aIsRejected && !bIsRejected) return -1;
        if (!aIsRejected && bIsRejected) return 1;
      }
      
      // Default secondary sort (e.g., ID or date if we had one; assuming larger ID is newer)
      return (b.id || 0) - (a.id || 0);
    });
  }, [rawModules, debouncedSearchQuery, filterCategory, filterLevel, filterStatus, sortOption]);

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage);
  const paginatedModules = filteredModules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenWizard = () => {
    actions.resetForm();
    setIsWizardOpen(true);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto animate-in fade-in duration-150 px-6 md:px-12 pt-2 md:pt-2 pb-12">
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
          rawModules={rawModules}
          paginatedModules={paginatedModules}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          handleOpenWizard={handleOpenWizard}
          setSearchQuery={setSearchQuery}
          setFilterCategory={setFilterCategory}
          setFilterLevel={setFilterLevel}
        />
      </div>

      <ModuleBuilderWizard 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        state={state}
        setters={setters}
        actions={actions}
        refetchModules={refetch}
        triggerFlowSequencePreview={triggerFlowSequencePreview}
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
      />
    </>
  );
}
