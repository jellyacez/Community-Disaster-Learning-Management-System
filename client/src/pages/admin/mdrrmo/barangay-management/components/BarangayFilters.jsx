
export default function BarangayFilters({ 
  selectedBarangay, 
  setSelectedBarangay, 
  searchQuery, 
  setSearchQuery 
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3 text-sm">
        <label className="font-bold text-gray-500 uppercase font-mono tracking-wider">Location Filter:</label>
        <select 
          value={selectedBarangay} 
          onChange={(e) => setSelectedBarangay(e.target.value)}
          className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
        >
          <option value="All">All Barangays</option>
          <option value="Balas">Barangay Balas</option>
          <option value="San Vicente">Barangay San Vicente</option>
          <option value="Cabalantian">Barangay Cabalantian</option>
        </select>
      </div>
      <input 
        type="text" 
        placeholder="Search resident name or status..." 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full sm:w-72 p-2.5 border border-gray-200 text-sm rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder-gray-400"
      />
    </div>
  );
}
