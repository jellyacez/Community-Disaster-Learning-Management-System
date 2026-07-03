import React from "react";
import { SkeletonBlock } from "../../../../components/ui/Skeleton";

export default function ResidentRegistrySkeleton() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
      {/* Skeleton for Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="h-10 w-48" />
        </div>
        <SkeletonBlock className="h-10 w-full sm:w-72" />
      </div>

      {/* Skeleton for Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-3"><SkeletonBlock className="h-3 w-24 rounded-full" /></th>
              <th className="pb-3"><SkeletonBlock className="h-3 w-32 rounded-full" /></th>
              <th className="pb-3"><SkeletonBlock className="h-3 w-20 rounded-full mx-auto" /></th>
              <th className="pb-3"><SkeletonBlock className="h-3 w-16 rounded-full mx-auto" /></th>
              <th className="pb-3"><SkeletonBlock className="h-3 w-16 rounded-full ml-auto" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <tr key={i}>
                <td className="py-4"><SkeletonBlock className="h-4 w-32 rounded-full" /></td>
                <td className="py-4"><SkeletonBlock className="h-4 w-24 rounded-full" /></td>
                <td className="py-4"><SkeletonBlock className="h-4 w-16 rounded-full mx-auto" /></td>
                <td className="py-4"><SkeletonBlock className="h-6 w-16 mx-auto" /></td>
                <td className="py-4"><SkeletonBlock className="h-8 w-20 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
