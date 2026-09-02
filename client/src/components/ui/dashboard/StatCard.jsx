import { memo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';

const StatCard = memo(function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  iconBg = "bg-gray-50 text-gray-600 border-gray-100", 
  onClick 
}) {
  return (
    <div 
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 outline-hidden ${
        onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="mt-2 text-3xl font-extrabold text-gray-900">{value}</div>
        <p className="mt-1 text-xs text-gray-500 truncate">{subtitle}</p>
      </div>
      {icon && (
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${iconBg}`}>
          <HugeiconsIcon icon={icon} className="w-6 h-6 stroke-[1.75]" />
        </div>
      )}
    </div>
  );
});

export default StatCard;