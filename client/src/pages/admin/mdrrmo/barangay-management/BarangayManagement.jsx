import ResidentInspectorPanel from "../../shared/ResidentInspectorPanel";
import { useBarangayManagement } from "./hooks/useBarangayManagement";
import BarangayFilters from "./components/BarangayFilters";
import ResidentStatsCards from "./components/ResidentStatsCards";
import ResidentDirectoryTable from "./components/ResidentDirectoryTable";

export default function BarangayManagement() {
  const { state, actions } = useBarangayManagement();

  if (state.isError) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
        <p className="font-bold">Error loading resident data.</p>
        <p className="text-sm">Please ensure the backend routes are connected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <BarangayFilters 
        selectedBarangay={state.selectedBarangay}
        setSelectedBarangay={actions.setSelectedBarangay}
        searchQuery={state.searchQuery}
        setSearchQuery={actions.setSearchQuery}
      />

      <ResidentStatsCards 
        stats={state.stats}
        isLoading={state.isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <ResidentDirectoryTable 
          residents={state.residents}
          isLoading={state.isLoading}
          setSelectedResident={actions.setSelectedResident}
          handleAccountAction={actions.handleAccountAction}
        />

        {/* Resident Inspection Panel */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-full min-h-[300px] flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wide mb-4 text-gray-400 border-b border-gray-100 pb-2 font-mono">
            Participant Breakdown
          </h3>
          <ResidentInspectorPanel selectedResident={state.selectedResident} />
        </div>
      </div>
    </div>
  );
}
