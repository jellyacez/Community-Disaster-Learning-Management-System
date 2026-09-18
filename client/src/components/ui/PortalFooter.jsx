export default function PortalFooter() {
  return (
    <footer className="shrink-0 w-full bg-white border-t border-gray-200/80 px-6 sm:px-8 py-3.5 z-20">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-gray-500 font-medium">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-gray-800">Bacolor LMS Portal</span>
          </div>
          <span className="hidden sm:inline text-gray-300">•</span>
          <span className="text-gray-600">
            Municipal Disaster Risk Reduction and Management Office (MDRRMO)
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 text-gray-400">
          <span className="hidden md:inline">
            Disaster Preparedness & Training Division
          </span>
          <span className="hidden md:inline text-gray-300">•</span>
          <span className="font-semibold text-gray-700 whitespace-nowrap">
            Emergency: <span className="text-red-600">911</span> / (045) 900-0199
          </span>
        </div>
      </div>
    </footer>
  );
}