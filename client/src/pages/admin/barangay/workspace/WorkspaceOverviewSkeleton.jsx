import React from "react";
import { SkeletonBlock } from "../../../../components/ui/Skeleton";

export default function WorkspaceOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[104px]">
            <SkeletonBlock className="h-3 w-32 mb-3" />
            <SkeletonBlock className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4 w-full h-[400px]">
          <div className="border-b border-gray-100 pb-2">
            <SkeletonBlock className="h-4 w-48" />
          </div>
          <div className="space-y-4 pt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <SkeletonBlock className="h-4 w-1/4 rounded-full" />
                <SkeletonBlock className="h-4 w-16 rounded-full" />
                <SkeletonBlock className="h-6 w-20 rounded-full" />
                <SkeletonBlock className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[400px]">
          <div className="border-b border-gray-100 pb-2 mb-6">
            <SkeletonBlock className="h-4 w-48" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <SkeletonBlock className="w-24 h-24 rounded-full" />
            <SkeletonBlock className="h-5 w-3/4 rounded-full" />
            <SkeletonBlock className="h-4 w-1/2 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
