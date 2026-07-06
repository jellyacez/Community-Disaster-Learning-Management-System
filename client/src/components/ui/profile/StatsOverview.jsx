import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon, Time02Icon, BookOpen01Icon } from "@hugeicons/core-free-icons";

export default function StatsOverview({ totalCompleted, totalHours, activeModules }) {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <article className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
          <HugeiconsIcon icon={CheckmarkBadge01Icon} className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500">Modules Completed</p>
          <p className="text-2xl font-black text-gray-900">{totalCompleted}</p>
        </div>
      </article>

      <article className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <HugeiconsIcon icon={Time02Icon} className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500">Training Hours</p>
          <p className="text-2xl font-black text-gray-900">{totalHours}h</p>
        </div>
      </article>

      <article className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-600">
          <HugeiconsIcon icon={BookOpen01Icon} className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500">Active Modules</p>
          <p className="text-2xl font-black text-gray-900">{activeModules}</p>
        </div>
      </article>
    </section>
  );
}
