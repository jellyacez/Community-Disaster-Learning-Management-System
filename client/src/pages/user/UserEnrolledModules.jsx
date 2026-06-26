// --- START: UserEnrolledModules.jsx ---
import React from "react";
import { useOutletContext, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import educationImg from "../../assets/education.svg";
import ModuleCard from "../../components/ui/modules/ModuleCard.jsx";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function UserEnrolledModules() {
  useDocumentTitle("Enrolled Modules | Bacolor LMS");
  const { currentUser } = useOutletContext();
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['userDashboard'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/user/dashboard`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      return response.json();
    }
  });
  
  const enrolledModules = dashboardData?.enrolledModules || [];
  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Enrolled Modules
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Keep track of your current learning progress and continue training.
          </p>
        </div>

        {enrolledModules.length === 0 && !isLoading ? (
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
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {enrolledModules.map((module) => (
              <ModuleCard key={module.id} module={module} enrolled />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// --- END: UserEnrolledModules.jsx ---
