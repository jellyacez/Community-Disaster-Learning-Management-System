import React from "react";

export default function EnrolledModuleCard({ module, onResume }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-5 hover:border-red-200 transition cursor-pointer">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              {module.category}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
              {module.level}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {module.title}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {module.description}
          </p>
        </div>

        <div className="min-w-52 flex-shrink-0">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-500">
              Progress
            </span>
            <span className="font-bold text-gray-900">
              {module.progress}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-red-600"
              style={{ width: `${module.progress}%` }}
            />
          </div>
          <button
            onClick={onResume}
            className="mt-4 w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer"
          >
            Resume Module
          </button>
        </div>
      </div>
    </div>
  );
}
