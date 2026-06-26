// --- START: UserModuleCatalog.jsx ---
import React from "react";
import { useOutletContext } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import ModuleCard from "../../components/ui/modules/ModuleCard.jsx";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { useQuery } from "@tanstack/react-query";
import continuousLearningImg from "../../assets/continuous-learning.svg";

export default function UserModuleCatalog() {
  const { currentUser } = useOutletContext();
  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["availableModules"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/modules/available`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  useDocumentTitle("Module Catalog | Bacolor LMS");
  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Module Catalog
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Explore training modules and enroll when ready.
            </p>
          </div>

          <div className="relative w-full md:max-w-sm">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search modules..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-red-400"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm font-medium text-gray-500">
              Loading Modules...
            </p>
          </div>
        ) : modules.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {modules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                enrolled={false}
              ></ModuleCard>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <img
              src={continuousLearningImg}
              alt="No modules mascot"
              className="w-48 h-48 mb-6 opacity-80"
            />
            <h3 className="text-lg font-semibold text-gray-700">
              All caught up!
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mt-2">
              You've explored all available modules. Check back later for new
              disaster readiness training!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
// --- END: UserModuleCatalog.jsx ---
