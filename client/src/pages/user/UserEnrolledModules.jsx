import React from "react";
import { useOutletContext } from "react-router-dom";
import ModuleCard from "../../components/ui/ModuleCard.jsx";
import { modules } from "../../data/mockData.js";

export default function UserEnrolledModules() {
  const { currentUser } = useOutletContext();
  const enrolledModules = modules.filter((module) => module.enrolled);

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
