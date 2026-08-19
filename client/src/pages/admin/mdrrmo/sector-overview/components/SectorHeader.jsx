export default function SectorHeader({ totalResidents, lastUpdated }) {
  return (
    <div className="mb-8">
      <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">Dashboard</li>
          <li>
            <div className="flex items-center">
              <span className="mx-2 text-gray-400">&gt;</span>
              <span>Audited Sector Data</span>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2 text-gray-400">&gt;</span>
              <span className="text-gray-900 font-semibold">Sector Overview</span>
            </div>
          </li>
        </ol>
      </nav>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Sector Overview</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Total Residents Across All Barangays: <span className="text-gray-900 font-bold tabular-nums">{totalResidents}</span></p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live Data • Last updated: {lastUpdated}
        </div>
      </div>
    </div>
  );
}
