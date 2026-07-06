import StatCard from "./StatCard.jsx";
import { SkeletonText } from "../Skeleton.jsx";

export default function DashboardStats({ displayData, loading }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Available Modules"
        value={
          loading ? (
            <SkeletonText className="h-8 w-16" />
          ) : (
            displayData.totalModules
          )
        }
        subtitle="Training modules ready for access"
      />
      <StatCard
        title="Enrolled Modules"
        value={
          loading ? (
            <SkeletonText className="h-8 w-16" />
          ) : (
            displayData.enrolledModules.length
          )
        }
        subtitle="Modules currently in progress"
      />
      <StatCard
        title="Announcements"
        value={
          loading ? (
            <SkeletonText className="h-8 w-16" />
          ) : (
            displayData.announcements.length
          )
        }
        subtitle="Latest updates from the system"
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
        <div>
          <p className="text-sm font-medium text-gray-500">Completion Rate</p>
          <div className="mt-2 text-3xl font-extrabold text-gray-900">{loading ? '...' : `${displayData.completionRate}%`}</div>
          <p className="mt-1 text-xs text-gray-500">Overall learning progress estimate</p>
        </div>
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg aria-hidden="true" className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle className="text-gray-100" strokeWidth="4" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
              <circle 
                className="text-red-500 transition-all duration-1000 ease-out" 
                strokeWidth="4" 
                strokeDasharray={100.53} 
                strokeDashoffset={loading ? 100.53 : 100.53 - ((displayData.completionRate||0)/100)*100.53} 
                strokeLinecap="round" 
                stroke="currentColor" 
                fill="transparent" 
                r="16" cx="18" cy="18" 
              />
            </svg>
        </div>
      </div>
    </section>
  );
}
