import StatCard from "./StatCard.jsx";
import { SkeletonText } from "../Skeleton.jsx";
import { BookOpen01Icon, Bookmark02Icon, Notification03Icon } from "@hugeicons/core-free-icons";

export default function DashboardStats({ displayData, loading, navigate }) {
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
        icon={BookOpen01Icon}
        iconBg="bg-blue-50 text-blue-600 border-blue-100/80"
        onClick={() => navigate?.("/user/modules")}
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
        icon={Bookmark02Icon}
        iconBg="bg-emerald-50 text-emerald-600 border-emerald-100/80"
        onClick={() => navigate?.("/user/enrolled")}
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
        icon={Notification03Icon}
        iconBg="bg-amber-50 text-amber-600 border-amber-100/80"
        onClick={() => navigate?.("/user/announcements")}
      />
      <div 
        onClick={() => navigate?.("/user/certificates")}
        role="progressbar"
        tabIndex={0}
        aria-valuenow={displayData.completionRate}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={`Module completion: ${displayData.completionRate}%`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate?.("/user/certificates");
          }
        }}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 outline-hidden"
      >
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-sm font-medium text-gray-500">Completion Rate</p>
          <div className="mt-2 text-3xl font-extrabold text-gray-900">{loading ? '...' : `${displayData.completionRate}%`}</div>
          <p className="mt-1 text-xs text-gray-500 truncate">Overall learning progress estimate</p>
        </div>
        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg aria-hidden="true" className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle className="text-gray-100" strokeWidth="4" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
              <circle 
                className="text-red-500 transition-all duration-1000 ease-out motion-reduce:transition-none" 
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
