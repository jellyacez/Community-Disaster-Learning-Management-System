import React, { memo } from 'react';

const ModuleCard = memo(function ModuleCard({ module, enrolled = false }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
          {module.category}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
          {module.level}
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          {module.duration}
        </span>
      </div>

      <h2 className="text-xl font-bold text-gray-900">{module.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{module.description}</p>

      {enrolled && (
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-gray-500">Progress</span>
            <span className="font-bold text-gray-900">{module.progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-red-600"
              style={{ width: `${module.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {enrolled ? (
          <button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer">
            Continue
          </button>
        ) : (
          <button className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-black transition cursor-pointer">
            Enroll Now
          </button>
        )}

        <button className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer">
          View Details
        </button>
      </div>
    </div>
  );
});

export default ModuleCard;