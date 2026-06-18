import React from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ModuleCard from "../../components/ui/modules/ModuleCard.jsx";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function UserEnrolledModules() {
  useDocumentTitle("Enrolled Modules | Bacolor LMS");
  const { currentUser } = useOutletContext();
  const { data: dashboardData } = useQuery({ queryKey: ['userDashboard'] });
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

        <div className="grid gap-5 lg:grid-cols-2">
          {enrolledModules.map((module) => (
            <ModuleCard key={module.id} module={module} enrolled />
          ))}
        </div>
      </div>
    </div>
  );
}
