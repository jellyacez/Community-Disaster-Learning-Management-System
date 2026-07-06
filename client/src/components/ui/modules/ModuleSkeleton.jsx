
export default function ModuleSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 p-5 animate-pulse">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full">
          <div className="h-5 w-24 bg-gray-200 rounded-full mb-3"></div>
          <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-full bg-gray-200 rounded"></div>
        </div>
        <div className="min-w-52 w-full md:w-52 flex-shrink-0">
          <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
          <div className="h-10 w-full bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
