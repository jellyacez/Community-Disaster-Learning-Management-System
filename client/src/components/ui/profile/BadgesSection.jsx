import React, { useMemo } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import { Award02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

export default function BadgesSection({ enrolledModules }) {
  const earnedBadges = useMemo(() => {
    const badges = [];
    if (!enrolledModules || enrolledModules.length === 0) return badges;
    
    // Flood Track
    const floodModules = enrolledModules.filter(m => m.category === 'Flood');
    const floodCompleted = floodModules.filter(m => m.progress === 100);
    if (floodModules.length > 0 && floodModules.length === floodCompleted.length) {
      badges.push({ title: 'Flood Master', color: 'bg-blue-100 text-blue-700', iconColor: 'text-blue-500' });
    }

    // Earthquake Track
    const earthquakeModules = enrolledModules.filter(m => m.category === 'Earthquake');
    const earthquakeCompleted = earthquakeModules.filter(m => m.progress === 100);
    if (earthquakeModules.length > 0 && earthquakeModules.length === earthquakeCompleted.length) {
      badges.push({ title: 'Earthquake Expert', color: 'bg-orange-100 text-orange-700', iconColor: 'text-orange-500' });
    }
    
    // Generic First Module
    const totalCompleted = enrolledModules.filter(m => m.progress === 100).length;
    if (totalCompleted >= 1) {
       badges.push({ title: 'First Module Completed', color: 'bg-green-100 text-green-700', iconColor: 'text-green-500' });
    }
    
    return badges;
  }, [enrolledModules]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-full flex flex-col">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <HugeiconsIcon icon={Award02Icon} className="h-6 w-6 text-yellow-500" /> Certificates & Badges
      </h2>
      
      {earnedBadges.length > 0 ? (
        <div className="flex flex-wrap gap-4 flex-1">
          {earnedBadges.map((badge, idx) => (
            <div key={idx} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${badge.color} border border-white/20 shadow-sm transition-transform hover:scale-105 duration-300 cursor-default h-fit`}>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className={`h-6 w-6 ${badge.iconColor}`} />
              {badge.title}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-6 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 flex-1">
          <HugeiconsIcon icon={Award02Icon} className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-500 max-w-xs">
            Complete your first disaster readiness module to earn your first badge.
          </p>
        </div>
      )}
    </section>
  );
}
