import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpen01Icon } from '@hugeicons/core-free-icons';

// Shown instead of a final assessment while earlier steps are incomplete
export default function LessonsRemaining({ titles = [], unsynced = false, onRetry }) {
  return (
    <div className="p-8 text-center bg-amber-50 border border-amber-200 rounded-3xl dark:bg-amber-950/30 dark:border-amber-900">
      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-amber-950/50 dark:text-amber-400">
        <HugeiconsIcon icon={BookOpen01Icon} className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2 dark:text-white">Complete the lessons first</h3>
      <p className="text-sm text-gray-600 dark:text-slate-300">
        {titles.length
          ? 'Finish these steps before starting the final assessment:'
          : 'Finish the earlier steps of this module before starting the final assessment.'}
      </p>
      {titles.length > 0 && (
        <ul className="mt-3 inline-block text-left text-sm font-semibold text-gray-800 list-disc pl-5 dark:text-slate-200">
          {titles.map((title, i) => (
            <li key={i}>{title}</li>
          ))}
        </ul>
      )}
      {unsynced && (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
          Some progress you saved offline hasn&apos;t synced yet. Stay connected and try again in a moment.
        </p>
      )}
      {onRetry && (
        <div>
          <button type="button" onClick={onRetry} className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
