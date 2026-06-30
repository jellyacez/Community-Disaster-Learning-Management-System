// --- START: UserEnrolledModules.jsx ---
import React, { useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import educationImg from "../../assets/education.svg";
import ModuleCard from "../../components/ui/modules/ModuleCard.jsx";
import ModuleSkeleton from "../../components/ui/modules/ModuleSkeleton.jsx";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import SearchBar from "../../components/ui/inputs/SearchBar.jsx";

export default function UserEnrolledModules() {
  useDocumentTitle("Enrolled Modules | Bacolor LMS");
  const { currentUser } = useOutletContext();
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['userDashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/user/dashboard');
      return response.data;
    }
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const enrolledModules = dashboardData?.enrolledModules || [];
  
  const filteredModules = enrolledModules.filter((module) =>
    module.modname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        {enrolledModules.length > 0 ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Enrolled Modules
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Keep track of your current learning progress and continue training.
              </p>
            </div>

            <SearchBar
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your enrolled modules..."
            />
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Enrolled Modules
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Keep track of your current learning progress and continue training.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <ModuleSkeleton key={i} />
            ))}
          </div>
        ) : enrolledModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-12 mb-12 p-8 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
            <img 
              src={educationImg} 
              alt="Education Mascot" 
              className="w-64 h-64 mb-6 opacity-90 drop-shadow-sm transition-transform hover:-translate-y-3 duration-500 ease-out" 
            />
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              No Enrolled Modules Yet!
            </h2>
            <p className="text-gray-500 mb-8 max-w-md">
              It looks like you haven't enrolled in any training modules. Start your learning journey today and be prepared!
            </p>
            <Link
              to="/user/modules"
              className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl hover:-translate-y-0.5 transition-all duration-300"
            >
              Browse Module Catalog
            </Link>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-8 py-16 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
            <HugeiconsIcon icon={Search01Icon} className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-500">We couldn't find any enrolled modules matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredModules.map((module) => (
              <ModuleCard key={module.id} module={module} enrolled />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// --- END: UserEnrolledModules.jsx ---
