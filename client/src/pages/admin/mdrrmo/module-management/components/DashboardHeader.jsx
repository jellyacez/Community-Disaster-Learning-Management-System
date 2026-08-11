import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Search01Icon, GridIcon, StarIcon } from "@hugeicons/core-free-icons";

export default function DashboardHeader({
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  filterCategory,
  setFilterCategory,
  filterLevel,
  setFilterLevel,
  filterStatus,
  setFilterStatus,
  sortOption,
  setSortOption,
  handleOpenWizard
}) {
  return (
    <div className="mb-8">
      <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">Dashboard</li>
          <li>
            <div className="flex items-center">
              <span className="mx-2 text-gray-400">&gt;</span>
              <span>Curriculum & Content</span>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2 text-gray-400">&gt;</span>
              <span className="text-gray-900 font-semibold">Training Modules</span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Training Modules</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Create, edit, and manage training curriculum</p>
        </div>
        <button 
          onClick={handleOpenWizard}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-sm"
        >
          <HugeiconsIcon icon={Add01Icon} className="w-5 h-5" />
          Create New Module
        </button>
      </div>

      {/* Search & Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm items-end">
        <div className="md:col-span-2 relative">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1 mb-1.5">
            <HugeiconsIcon icon={Search01Icon} className="w-3 h-3" />
            Search Modules
          </label>
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by title or description..." 
              value={searchQuery} 
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/10 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="md:col-span-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1 mb-1.5">
            <HugeiconsIcon icon={GridIcon} className="w-3 h-3" />
            Category
          </label>
          <select 
            value={filterCategory} 
            onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
            className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-transparent rounded-xl text-sm font-bold text-gray-700 outline-none focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/10 cursor-pointer transition-all appearance-none"
          >
            <option value="All">All Categories</option>
            <option value="Flood">Flood</option>
            <option value="Earthquake">Earthquake</option>
            <option value="Fire">Fire</option>
            <option value="General">General / All Hazards</option>
          </select>
        </div>
        
        <div className="md:col-span-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1 mb-1.5">
            <HugeiconsIcon icon={StarIcon} className="w-3 h-3" />
            Level
          </label>
          <select 
            value={filterLevel} 
            onChange={(e) => { setFilterLevel(e.target.value); setCurrentPage(1); }}
            className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-transparent rounded-xl text-sm font-bold text-gray-700 outline-none focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/10 cursor-pointer transition-all appearance-none"
          >
            <option value="All">All Levels</option>
            <option value="Level 1">Beginner</option>
            <option value="Level 2">Intermediate</option>
            <option value="Level 3">Advanced</option>
          </select>
        </div>
        
        <div className="md:col-span-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1 mb-1.5">
            <HugeiconsIcon icon={StarIcon} className="w-3 h-3" />
            Status
          </label>
          <select 
            value={filterStatus} 
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-transparent rounded-xl text-sm font-bold text-gray-700 outline-none focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/10 cursor-pointer transition-all appearance-none"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Drafts">Drafts</option>
            <option value="Pending Review">Pending Review</option>
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1 mb-1.5">
            <HugeiconsIcon icon={GridIcon} className="w-3 h-3" />
            Sort By
          </label>
          <select 
            value={sortOption} 
            onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
            className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-transparent rounded-xl text-sm font-bold text-gray-700 outline-none focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/10 cursor-pointer transition-all appearance-none"
          >
            <option value="Needs revision first">Needs Revision First</option>
            <option value="Recently edited">Recently Edited</option>
          </select>
        </div>
      </div>
    </div>
  );
}
