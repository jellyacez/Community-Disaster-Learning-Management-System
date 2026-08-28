import { SkeletonBlock } from "../../../../components/ui/Skeleton";

export default function WorkspaceOverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse pb-10">
      {/* Header Card Skeleton */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <SkeletonBlock className="h-8 w-80 mb-2 rounded-lg" />
          <SkeletonBlock className="h-4 w-48 rounded" />
        </div>
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-12 w-44 rounded-xl" />
          <SkeletonBlock className="h-10 w-32 rounded" />
          <SkeletonBlock className="h-10 w-36 rounded" />
        </div>
      </div>

      {/* 5 Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm w-full h-[120px] flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <SkeletonBlock className="h-4 w-24 rounded" />
              <SkeletonBlock className="w-8 h-8 rounded-full" />
            </div>
            <div>
              <SkeletonBlock className="h-7 w-16 mb-1 rounded" />
              <SkeletonBlock className="h-3 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Body Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-4 h-[360px] flex flex-col justify-between">
          <div className="border-b border-gray-100 pb-3">
            <SkeletonBlock className="h-5 w-48 mb-1" />
            <SkeletonBlock className="h-3 w-36" />
          </div>
          <SkeletonBlock className="w-36 h-36 rounded-full mx-auto" />
          <div className="pt-3 border-t border-gray-100 flex justify-between">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-5 h-[360px] flex flex-col justify-between">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <div>
              <SkeletonBlock className="h-5 w-40 mb-1" />
              <SkeletonBlock className="h-3 w-32" />
            </div>
            <SkeletonBlock className="h-4 w-20 rounded" />
          </div>
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="h-3 w-12" />
                </div>
                <SkeletonBlock className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100">
            <SkeletonBlock className="h-4 w-full" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-3 h-[360px] flex flex-col justify-between">
          <div className="border-b border-gray-100 pb-3">
            <SkeletonBlock className="h-5 w-32 mb-1" />
            <SkeletonBlock className="h-3 w-40" />
          </div>
          <div className="flex-1 flex flex-col justify-between gap-2.5 pt-3">
            <SkeletonBlock className="h-11 w-full rounded-xl" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

