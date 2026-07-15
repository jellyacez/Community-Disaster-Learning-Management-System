import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ModuleBuilderWizard from "./ModuleBuilderWizard";
import DashboardHeader from "./components/DashboardHeader";
import ModuleGrid from "./components/ModuleGrid";
import apiClient from "../../../../lib/apiClient";
import { useModuleBuilder } from "../../../../hooks/useModuleBuilder";
import useDebounce from "../../../../hooks/useDebounce";

const fetchModules = async () => {
  const res = await apiClient.get("/modules/available"); 
  return res.data;
};

export default function ModuleManagement() {
  const { data: rawModules = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["adminModules"],
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredModules = useMemo(() => {
    return rawModules.filter(mod => {
      const matchesSearch = mod.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesCat = filterCategory === "All" || mod.category === filterCategory;
      const matchesLevel = filterLevel === "All" || mod.level === filterLevel;
      return matchesSearch && matchesCat && matchesLevel;
    });
  }, [rawModules, debouncedSearchQuery, filterCategory, filterLevel]);

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage);
  const paginatedModules = filteredModules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenWizard = () => {
    actions.resetForm();
    setIsWizardOpen(true);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto animate-in fade-in duration-150 pb-12 p-6 md:p-12">
        <DashboardHeader 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setCurrentPage={setCurrentPage}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterLevel={filterLevel}
          setFilterLevel={setFilterLevel}
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
