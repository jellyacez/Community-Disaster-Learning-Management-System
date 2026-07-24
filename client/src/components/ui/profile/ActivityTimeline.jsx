import { useMemo } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import { Activity01Icon } from "@hugeicons/core-free-icons";

export default function ActivityTimeline({ enrolledModules }) {
  const activities = useMemo(() => {
    if (!enrolledModules || enrolledModules.length === 0) return [];

    let logs = [];
    // Map enrolled modules to state-based activity logic
    enrolledModules.forEach(m => {
      if (m.progress === 100) {
        logs.push({ title: `Completed ${m.title}`, status: 'Status: Completed', color: 'bg-green-500' });
      } else if (m.progress > 0) {
        logs.push({ title: `Started ${m.title} (${m.progress}%)`, status: 'Status: In Progress', color: 'bg-blue-500' });
      } else {
        logs.push({ title: `Enrolled in ${m.title}`, status: 'Status: Enrolled', color: 'bg-gray-400' });
      }
    });

    // Sort logic conceptually puts completed items at top
    logs.sort((a, b) => {
      if (a.status === 'Status: Completed' && b.status !== 'Status: Completed') return -1;
      if (b.status === 'Status: Completed' && a.status !== 'Status: Completed') return 1;
      return 0;
    });

    return logs.slice(0, 5); // Limit to top 5 recent activities
  }, [enrolledModules]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-full flex flex-col">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>

      {activities.length > 0 ? (
        <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 flex-1">
          {activities.map((act, idx) => (
            <article key={idx} className="relative pl-6">
              <span className={`absolute-left-[9px] top-1 h-4 w-4 rounded-full ring-4 ring-white ${act.color}`}></span>
              <p className="text-sm font-semibold text-gray-900">{act.title}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{act.status}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-6 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 flex-1">
          <HugeiconsIcon icon={Activity01Icon} className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-500 max-w-xs">
            No recent activity yet. Enroll in a module to start learning!
          </p>
        </div>
      )}
    </section>
  );
}
