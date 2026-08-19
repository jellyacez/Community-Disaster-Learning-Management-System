import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, StarAward01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";

export default function SectorInsights({ kpiData, top5, bottom5, sectorData, setSearchQuery, setFilters }) {
  const insights = useMemo(() => {
    if (!kpiData || !top5 || !bottom5) return [];
    const list = [];
    
    if (kpiData.belowThreshold > 0) {
      list.push({
        type: 'warning',
        badge: 'ACTION REQUIRED',
        title: `${kpiData.belowThreshold} Barangays at 0% Completion`,
        text: 'Targeted outreach is recommended for inactive sectors.',
        icon: Alert01Icon,
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        filterable: true,
        onClick: () => {
          setSearchQuery("");
          setFilters({ minResidents: '', minCompletion: '', maxCompletion: '0', status: 'All' });
          setTimeout(() => document.getElementById('auditable-ledger')?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      });
    }

    if (top5.length > 0 && top5[0].avg_completion_rate >= 50) {
      list.push({
        type: 'success',
        badge: 'TOP PERFORMER',
        title: `${top5[0].barangay} leads with ${top5[0].avg_completion_rate}% completion`,
        text: 'Consider them for pilot programs.',
        icon: StarAward01Icon,
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
        filterable: true,
        onClick: () => {
          setSearchQuery(top5[0].barangay);
          setFilters({ minResidents: '', minCompletion: '', maxCompletion: '', status: 'All' });
          setTimeout(() => document.getElementById('auditable-ledger')?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      });
    }

    const noResidents = sectorData.filter(b => b.resident_count === 0 && b.barangay !== 'Unassigned').length;
    if (noResidents > 0) {
      list.push({
        type: 'info',
        badge: 'COVERAGE GAP',
        title: `${noResidents} Barangays Unregistered`,
        text: 'No residents have registered on the platform yet.',
        icon: UserGroupIcon,
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        filterable: true,
        onClick: () => {
          setSearchQuery("");
          setFilters({ minResidents: '', minCompletion: '', maxCompletion: '', status: 'Zero Coverage' });
          setTimeout(() => document.getElementById('auditable-ledger')?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      });
    }

    return list;
  }, [kpiData, top5, bottom5, sectorData, setSearchQuery, setFilters]);

  if (insights.length === 0) return null;

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      {insights.map((insight, idx) => (
        <div 
          key={idx} 
          onClick={insight.onClick}
          className={`p-5 rounded-2xl border ${insight.bg} ${insight.border} flex flex-col justify-between transition-all duration-200 ${insight.filterable ? 'cursor-pointer hover:scale-[1.01] hover:shadow-md' : ''}`}
        >
          <div>
            {/* Badge and Icon */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${insight.iconBg} ${insight.color}`}>
                <HugeiconsIcon icon={insight.icon} className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-extrabold tracking-widest uppercase ${insight.color}`}>
                {insight.badge}
              </span>
            </div>
            
            {/* Content */}
            <h3 className="text-gray-900 font-bold text-base leading-tight mb-1.5">
              {insight.title}
            </h3>
            <p className="text-xs font-medium text-gray-600/80 leading-relaxed">
              {insight.text}
            </p>
          </div>

          {/* Action Link */}
          {insight.filterable && (
            <div className={`mt-4 pt-4 border-t ${insight.border} text-xs font-extrabold ${insight.color} flex items-center gap-1 group`}>
              Filter Table 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
