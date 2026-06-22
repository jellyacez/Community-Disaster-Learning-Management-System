import React from "react";

export function SkeletonBlock({ className = "" }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-md ${className}`}></div>
  );
}

export function SkeletonText({ className = "h-4 w-3/4" }) {
  return <SkeletonBlock className={`${className} rounded-full`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-200"></div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-5 bg-gray-200 rounded-full w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded-full w-1/2"></div>
        </div>
      </div>
      <div className="h-4 bg-gray-200 rounded-full w-full mt-2"></div>
      <div className="h-4 bg-gray-200 rounded-full w-5/6"></div>
      <div className="flex justify-between items-center mt-4">
        <div className="h-8 bg-gray-200 rounded-full w-24"></div>
        <div className="h-4 bg-gray-200 rounded-full w-16"></div>
      </div>
    </div>
  );
}

export function SkeletonTableRow({ columns = 5 }) {
  return (
    <tr className="animate-pulse border-b border-gray-100 last:border-0">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4 whitespace-nowrap">
          {i === 0 ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-4 bg-gray-200 rounded-full w-24"></div>
                <div className="h-3 bg-gray-200 rounded-full w-32"></div>
              </div>
            </div>
          ) : (
            <div className="h-4 bg-gray-200 rounded-full w-16"></div>
          )}
        </td>
      ))}
    </tr>
  );
}
