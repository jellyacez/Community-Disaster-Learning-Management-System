import React from "react";
import { useOutletContext } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import ModuleCard from "../../components/ui/modules/ModuleCard.jsx";
import { modules } from "../../data/mockData.js";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function UserModuleCatalog() {
  const { currentUser } = useOutletContext();

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

        <div className="grid gap-5 lg:grid-cols-2">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              enrolled={module.enrolled}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
