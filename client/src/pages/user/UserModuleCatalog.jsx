import { useState, useMemo } from "react";
import ModuleCard from "../../components/ui/modules/ModuleCard.jsx";
import ModuleSkeleton from "../../components/ui/modules/ModuleSkeleton.jsx";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import SearchBar from "../../components/ui/inputs/SearchBar.jsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import continuousLearningImg from "../../assets/continuous-learning.svg";

export default function UserModuleCatalog() {
  const queryClient = useQueryClient();
  
  const { data: rawModules = [], isLoading } = useQuery({
    queryKey: ["availableModules"],
    queryFn: async () => {
      const res = await apiClient.get('/modules/available');
      return res.data;
    },
  });

  // Normalize dataset to standardize fields across components
  const modules = useMemo(() => {
    return rawModules.map((mod) => ({
      ...mod,
      id: mod.id || mod.mod_id,
      title: mod.title || mod.modname || "Untitled Module",
      category: mod.category || mod.modcat || "General",
      level: mod.level || "Level 1",
      duration: mod.duration || "Varies",
      image_url: mod.image_url || null,
      progress: parseInt(mod.progress || 0),
      status: mod.status || "Not Started",
      is_enrolled: mod.is_enrolled || false
    }));
  }, [rawModules]);

  const handleEnrollSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["availableModules"] });
    queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
  };

  const [searchQuery, setSearchQuery] = useState("");

  const filteredModules = useMemo(() => {
    // Exclude modules the user is already enrolled in (whether in-progress or done)
    let result = modules.filter(mod => !mod.is_enrolled);

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (mod) =>
          mod.title?.toLowerCase().includes(lowerQuery) ||
          mod.category?.toLowerCase().includes(lowerQuery)
      );
    }
    return result;
  }, [modules, searchQuery]);

  useDocumentTitle("Module Catalog | Bacolor LMS");

  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Module Catalog</h1>
            <p className="mt-1 text-sm text-gray-600">Explore training modules and enroll when ready.</p>
          </div>
          <SearchBar value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search modules..." />
        </div>

        {isLoading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => <ModuleSkeleton key={i} />)}
          </div>
        ) : filteredModules.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                enrolled={module.is_enrolled}
                onEnrollSuccess={handleEnrollSuccess}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <img src={continuousLearningImg} alt="No modules mascot" className="w-48 h-48 mb-6 opacity-80" />
            <h2 className="text-lg font-semibold text-gray-700">All caught up!</h2>
            <p className="text-sm text-gray-600 max-w-xs mt-2">You've explored all available modules. Check back later for training updates!</p>
          </div>
        )}
      </div>
    </div>
  );
}