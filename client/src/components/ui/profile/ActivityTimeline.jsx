import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from "@hugeicons/react";
import { Activity01Icon, CheckmarkCircle02Icon, BookOpen01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function ActivityTimeline({ enrolledModules }) {
  const activities = useMemo(() => {
    if (!enrolledModules || enrolledModules.length === 0) return [];

    let logs = [];
    enrolledModules.forEach((m) => {
      if (m.progress === 100) {
        logs.push({
          id: m.id,
          title: m.title,
          category: m.category,
          status: 'Completed',
          badgeText: 'Completed',
          badgeClass: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-500 ring-green-100',
          progress: 100,
        });
      } else if (m.progress > 0) {
        logs.push({
          id: m.id,
          title: m.title,
          category: m.category,
          status: 'In Progress',
          badgeText: `${m.progress}% Complete`,
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500 ring-blue-100',
          progress: m.progress,
        });
      } else {
        logs.push({
          id: m.id,
          title: m.title,
          category: m.category,
          status: 'Enrolled',
          badgeText: 'Enrolled',
          badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
          dotColor: 'bg-gray-400 ring-gray-100',
          progress: 0,
        });
      }
    });

    // Completed on top, followed by in-progress
    logs.sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return -1;
      if (b.status === 'Completed' && a.status !== 'Completed') return 1;
      return b.progress - a.progress;
    });

    return logs.slice(0, 5); // Limit to top 5 recent activities
  }, [enrolledModules]);

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <HugeiconsIcon icon={Activity01Icon} className="h-6 w-6 text-red-600" />
          Recent Activity
        </h2>
        {activities.length > 0 && (
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Latest Modules
          </span>
        )}
      </div>

      {activities.length > 0 ? (
        <div className="relative border-l-2 border-gray-100 ml-3 space-y-6 flex-1 my-1">
          {activities.map((act, idx) => (
            <article key={idx} className="relative pl-6 group">
              {/* Bullet Dot */}
              <span
                className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full ring-4 ring-white shadow-xs transition-transform group-hover:scale-125 ${act.dotColor}`}
              />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <Link
                  to={`/user/modules/${act.id}`}
                  className="text-sm font-bold text-gray-900 hover:text-red-600 transition-colors inline-flex items-center gap-1.5"
                >
                  {act.title}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-600"
                  />
                </Link>
                <span
                  className={`self-start sm:self-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${act.badgeClass}`}
                >
                  {act.badgeText}
                </span>
              </div>

              {act.category && (
                <p className="text-xs text-gray-400 font-medium mt-1">
                  Category: <span className="text-gray-600 font-semibold">{act.category}</span>
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex-1">
          <HugeiconsIcon icon={BookOpen01Icon} className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-bold text-gray-700">No learning activity yet</p>
          <p className="text-xs text-gray-500 max-w-xs mt-1">
            Enroll in a disaster readiness module to start tracking your activity!
          </p>
        </div>
      )}
    </section>
  );
}
