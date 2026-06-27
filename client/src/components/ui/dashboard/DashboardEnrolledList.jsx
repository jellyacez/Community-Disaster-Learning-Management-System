import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { BookOpen01Icon } from "@hugeicons/core-free-icons";
import ModuleSkeleton from "../modules/ModuleSkeleton.jsx";
import EnrolledModuleCard from "../modules/EnrolledModuleCard.jsx";

export default function DashboardEnrolledList({ displayData, loading, navigate, handleResume }) {
  return (
    <div className="lg:col-span-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-full flex flex-col">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Continue Your Modules
            </h2>
            <p className="text-sm text-gray-500">
              Resume training where you left off.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            [1, 2].map((i) => <ModuleSkeleton key={i} />)
          ) : displayData.enrolledModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <HugeiconsIcon
                  icon={BookOpen01Icon}
                  className="w-8 h-8 text-gray-400"
                />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                No Modules Enrolled
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mb-6">
                You haven't enrolled in any disaster preparedness modules
                yet. Head over to the catalog to get started!
              </p>
              <button
                onClick={() => navigate("/user/catalog")}
                className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700 transition"
              >
                Explore Catalog
              </button>
            </div>
          ) : (
            displayData.enrolledModules.slice(0, 4).map((module) => (
              <EnrolledModuleCard
                key={module.id}
                module={module}
                onResume={handleResume}
              />
            ))
          )}
        </div>

        {!loading && displayData.enrolledModules.length > 4 && (
          <button
            onClick={() => navigate("/user/enrolled")}
            className="w-full mt-6 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            View All Enrolled Modules
          </button>
        )}
      </div>
    </div>
  );
}
