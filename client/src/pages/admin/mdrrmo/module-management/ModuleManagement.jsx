import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ModuleHeaderForm from "./ModuleHeaderForm";
import LevelSelector from "./LevelBuilder"; 
import SequenceCanvas from "./SequenceCanvas";
import StepBuilder from "./StepBuilder";
import ModuleCard from "../../../../components/ui/modules/ModuleCard";
import ModulePlayerPreviewModal from "../../../../components/ui/modules/viewer/ModulePlayerPreviewModal";
import ConfirmationModal from "../../../../components/ui/modals/ConfirmationModal";
import StickyBuilderNav from "./StickyBuilderNav";
import ModuleBuilderWizard from "./ModuleBuilderWizard";
import apiClient from "../../../../lib/apiClient";
import { useModuleBuilder } from "../../../../hooks/useModuleBuilder";
import useDebounce from "../../../../hooks/useDebounce";

const fetchModules = async () => {
  const res = await apiClient.get("/modules/available"); 
  return res.data;
};

export default function ModuleManagement() {
  const { isLoading, isError } = useQuery({
    queryKey: ["adminModules"],
    queryFn: fetchModules,
    retry: 1
  });

  const { state, setters, actions } = useModuleBuilder();
  const {
    editingModuleId,
    moduleForm,
    stagedLevels,
    activeLevelOrder,
    stagedFlows,
    currentFlowStep,
    currentQuizQuestion,
    currentSituationalData,
    situationalImage,
    writtenMaterialFile,
    formErrors
  } = state;

  const {
    setModuleForm,
    setStagedLevels,
    setActiveLevelOrder,
    setStagedFlows,
    setCurrentFlowStep,
    setCurrentQuizQuestion,
    setCurrentSituationalData,
    setSituationalImage,
    setWrittenMaterialFile,
    setFormErrors
  } = setters;

  const {
    addStepToFlow,
    addQuizQuestionToStep,
    handleModuleSubmit,
    triggerFlowSequencePreview
  } = actions;

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Dashboard UI State
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const rawModules = isError ? [] : (useQuery({
    queryKey: ["adminModules"],
    queryFn: fetchModules,
    retry: 1
  }).data || []);

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
    setIsWizardOpen(true);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto animate-in fade-in duration-150 pb-12 p-6 md:p-12">
        
        {/* Header Actions */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Module Management</h1>
              <p className="text-sm font-medium text-gray-500 mt-1">Create, edit, and publish training modules</p>
            </div>
            <button 
              onClick={handleOpenWizard}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Create New Module
            </button>
          </div>

          {/* Search & Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm items-end">
            <div className="md:col-span-2 relative">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1 mb-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Search Modules
              </label>
              <div className="relative">
                <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                  type="text" 
                  placeholder="Search by title or description..." 
                  value={searchQuery} 
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/10 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 outline-none transition-all"
                />
              </div>
            </div>
            
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1 mb-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                Category
              </label>
              <select 
                value={filterCategory} 
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-transparent rounded-xl text-sm font-bold text-gray-700 outline-none focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/10 cursor-pointer transition-all appearance-none"
              >
                <option value="All">All Categories</option>
                <option value="Flooding">Flooding</option>
                <option value="Earthquakes">Earthquakes</option>
                <option value="Fire">Fire</option>
                <option value="General Safety">General Safety</option>
              </select>
            </div>
            
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1 mb-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                Level
              </label>
              <select 
                value={filterLevel} 
                onChange={(e) => { setFilterLevel(e.target.value); setCurrentPage(1); }}
                className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-transparent rounded-xl text-sm font-bold text-gray-700 outline-none focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/10 cursor-pointer transition-all appearance-none"
              >
                <option value="All">All Levels</option>
                <option value="Level 1">Beginner</option>
                <option value="Level 2">Intermediate</option>
                <option value="Level 3">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center p-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
          </div>
        ) : isError ? (
           <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center">
             <p className="font-bold text-lg">Error loading modules.</p>
             <p className="text-sm">Please ensure the backend routes are connected.</p>
           </div>
        ) : rawModules.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-200 border-dashed">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">No Learning Paths Yet</h3>
             <p className="text-gray-500 mb-6 max-w-md mx-auto">You haven't created any training modules yet. Click the button above to start building your first learning path.</p>
             <button onClick={handleOpenWizard} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">Start Building</button>
          </div>
        ) : paginatedModules.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 font-medium">No learning paths match your filters.</p>
            <button onClick={() => { setSearchQuery(""); setFilterCategory("All"); setFilterLevel("All"); }} className="mt-4 text-red-600 font-bold hover:underline">Clear Filters</button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {paginatedModules.map(mod => (
                <ModuleCard 
                  key={mod.id} 
                  module={mod} 
                  enrolled={false} 
                  isAdminView={true}
                  onPreviewClick={() => {}} 
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${currentPage === i + 1 ? 'bg-red-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ModuleBuilderWizard 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        state={state}
        setters={setters}
        actions={actions}
        triggerFlowSequencePreview={triggerFlowSequencePreview}
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
      />
    </>
  );
}
