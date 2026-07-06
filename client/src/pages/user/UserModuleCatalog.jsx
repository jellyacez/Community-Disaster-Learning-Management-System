import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";

import ModuleCard from "../../components/ui/modules/ModuleCard.jsx";
import ModuleSkeleton from "../../components/ui/modules/ModuleSkeleton.jsx";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import SearchBar from "../../components/ui/inputs/SearchBar.jsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import continuousLearningImg from "../../assets/continuous-learning.svg";

export default function UserModuleCatalog() {
  const queryClient = useQueryClient();
  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["availableModules"],
    queryFn: async () => {
      const res = await apiClient.get('/modules/available');
      return res.data;
    },
  });

  const handleEnrollSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["availableModules"] });
    queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
  };

  const [searchQuery, setSearchQuery] = useState("");

  const filteredModules = useMemo(() => {
    if (!searchQuery) return modules;
    const lowerQuery = searchQuery.toLowerCase();
    return modules.filter(
      (mod) =>
        mod.title?.toLowerCase().includes(lowerQuery) ||
        mod.category?.toLowerCase().includes(lowerQuery)
    );
  }, [modules, searchQuery]);

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

          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search modules..."
          />
        </div>

        {isLoading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <ModuleSkeleton key={i} />
            ))}
          </div>
        ) : filteredModules.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                enrolled={module.is_enrolled}
                onEnrollSuccess={handleEnrollSuccess}
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
