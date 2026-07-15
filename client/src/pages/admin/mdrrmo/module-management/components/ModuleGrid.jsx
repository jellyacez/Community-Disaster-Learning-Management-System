import ModuleCard from "../../../../../components/ui/modules/ModuleCard";
import { HugeiconsIcon } from "@hugeicons/react";
import { Folder01Icon } from "@hugeicons/core-free-icons";

export default function ModuleGrid({
  isLoading,
  isError,
  rawModules,
  paginatedModules,
  totalPages,
  currentPage,
  setCurrentPage,
  handleOpenWizard,
  setSearchQuery,
  setFilterCategory,
  setFilterLevel
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center">
        <p className="font-bold text-lg">Error loading modules.</p>
        <p className="text-sm">Please ensure the backend routes are connected.</p>
      </div>
    );
  }

  if (rawModules.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-3xl border border-gray-200 border-dashed">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <HugeiconsIcon icon={Folder01Icon} className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Learning Paths Yet</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          You haven't created any training modules yet. Click the button above to start building your first learning path.
        </p>
        <button onClick={handleOpenWizard} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
          Start Building
        </button>
      </div>
    );
  }

  if (paginatedModules.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-medium">No learning paths match your filters.</p>
        <button 
          onClick={() => { setSearchQuery(""); setFilterCategory("All"); setFilterLevel("All"); }} 
          className="mt-4 text-red-600 font-bold hover:underline"
        >
          Clear Filters
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {paginatedModules.map((mod) => (
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
  );
}
