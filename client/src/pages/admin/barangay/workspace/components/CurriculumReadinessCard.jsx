import React from "react";
import PropTypes from "prop-types";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Folder01Icon, 
  ArrowLeft01Icon, 
  ArrowRight01Icon 
} from "@hugeicons/core-free-icons";

export default function CurriculumReadinessCard({
  modulePerformance,
  paginatedModules,
  modulePage,
  setModulePage,
  totalModules,
  totalModulePages,
  moduleLimit,
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-5 flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Curriculum Readiness</h3>
          <p className="text-xs text-gray-400 mt-0.5">Disaster module completions</p>
        </div>
        <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
          MDRRMO Scoped
        </span>
      </div>

      <div className="space-y-4 my-auto py-3">
        {modulePerformance.length === 0 ? (
          <div className="text-center py-8">
            <HugeiconsIcon icon={Folder01Icon} className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400 italic">No syllabus engagement recorded yet for this barangay.</p>
          </div>
        ) : (
          paginatedModules.map((mod) => {
            const enrolled = parseInt(mod.total_enrolled, 10) || 0;
            const completed = parseInt(mod.completed_count, 10) || 0;
            const rate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

            return (
              <div key={mod.module_id} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-800">{mod.module_title}</span>
                  <span className="font-mono text-gray-500">{completed}/{enrolled} ({rate}%)</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-red-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Table / List Pagination Footer */}
      <div className="pt-3 border-t border-gray-100 space-y-2.5">
        {totalModules > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              Showing <span className="font-medium text-gray-900">{(modulePage - 1) * moduleLimit + 1}</span> to{" "}
              <span className="font-medium text-gray-900">
                {Math.min(modulePage * moduleLimit, totalModules)}
              </span>{" "}
              of <span className="font-medium text-gray-900">{totalModules}</span> modules
            </p>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setModulePage((p) => Math.max(p - 1, 1))}
                disabled={modulePage <= 1}
                className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer flex items-center gap-1"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3 h-3" />
                Previous
              </button>
              <span className="text-xs font-medium text-gray-600 px-1">
                Page {modulePage} of {totalModulePages}
              </span>
              <button
                type="button"
                onClick={() => setModulePage((p) => Math.min(p + 1, totalModulePages))}
                disabled={modulePage >= totalModulePages}
                className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer flex items-center gap-1"
              >
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
        <div className="text-[11px] text-gray-400 flex justify-between">
          <span>Minimum Passing: 80%</span>
          <span>Accredited DRRM Standard</span>
        </div>
      </div>
    </div>
  );
}

CurriculumReadinessCard.propTypes = {
  modulePerformance: PropTypes.array.isRequired,
  paginatedModules: PropTypes.array.isRequired,
  modulePage: PropTypes.number.isRequired,
  setModulePage: PropTypes.func.isRequired,
  totalModules: PropTypes.number.isRequired,
  totalModulePages: PropTypes.number.isRequired,
  moduleLimit: PropTypes.number.isRequired,
};
