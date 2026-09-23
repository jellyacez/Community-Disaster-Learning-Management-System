import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from "@hugeicons/react";

import {
  Award02Icon,
  CheckmarkCircle02Icon,
  CheckmarkBadge01Icon,
  TsunamiIcon,
  Alert01Icon,
  FlameIcon,
  Shield02Icon,
  BookOpen01Icon,
  LockKeyIcon,
  Certificate01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

export default function BadgesSection({ enrolledModules = [], categoryTotals = {} }) {
  const { achievements, badges, earnedCount, totalCount } = useMemo(() => {
    if (!enrolledModules) return { achievements: [], badges: [], earnedCount: 0, totalCount: 0 };

    const totalCompleted = enrolledModules.filter((m) => m.progress === 100).length;

    // Completed counts per category
    const floodCompleted = enrolledModules.filter((m) =>
      m.category?.toLowerCase().includes("flood") && m.progress === 100
    ).length;

    const fundamentalCompleted = enrolledModules.filter((m) =>
      m.category?.toLowerCase().includes("fundamental") && m.progress === 100
    ).length;

    const earthquakeCompleted = enrolledModules.filter((m) =>
      m.category?.toLowerCase().includes("earthquake") && m.progress === 100
    ).length;

    const fireCompleted = enrolledModules.filter((m) =>
      m.category?.toLowerCase().includes("fire") && m.progress === 100
    ).length;

    // Helper to calculate total catalog modules for a category from system totals
    const getCategoryCatalogTotal = (catKeyword) => {
      let sum = 0;
      if (categoryTotals && typeof categoryTotals === "object") {
        Object.entries(categoryTotals).forEach(([cat, count]) => {
          if (cat.toLowerCase().includes(catKeyword)) {
            sum += Number(count) || 0;
          }
        });
      }
      // Fallback to enrolled modules in this category if categoryTotals is not available
      if (sum === 0) {
        sum = enrolledModules.filter((m) => m.category?.toLowerCase().includes(catKeyword)).length;
      }
      return sum;
    };

    const totalFloodCatalog = getCategoryCatalogTotal("flood");
    const totalEarthquakeCatalog = getCategoryCatalogTotal("earthquake");
    const totalFireCatalog = getCategoryCatalogTotal("fire");
    const totalFundamentalCatalog = getCategoryCatalogTotal("fundamental");

    const badgeDefinitions = [
      // ---------------- ACHIEVEMENTS ----------------
      {
        id: "first_module",
        type: "achievement",
        title: "First Step Taken",
        description: "Complete your 1st learning module",
        icon: CheckmarkBadge01Icon,
        isUnlocked: totalCompleted >= 1,
        progressText: `${Math.min(1, totalCompleted)}/1 Module`,
        theme: {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          text: "text-emerald-900",
          iconBg: "bg-emerald-500",
          ring: "ring-emerald-500/20",
        },
      },
      {
        id: "disaster_scholar",
        type: "achievement",
        title: "Disaster Scholar",
        description: "Complete 3 or more total modules",
        icon: BookOpen01Icon,
        isUnlocked: totalCompleted >= 3,
        progressText: `${Math.min(3, totalCompleted)}/3 Completed`,
        theme: {
          bg: "bg-purple-50",
          border: "border-purple-200",
          text: "text-purple-900",
          iconBg: "bg-purple-500",
          ring: "ring-purple-500/20",
        },
      },
      {
        id: "on_fire",
        type: "achievement",
        title: "On Fire!",
        description: "Complete 5 or more total modules",
        icon: "/onfirebadge.png",
        isUnlocked: totalCompleted >= 5,
        progressText: `${Math.min(5, totalCompleted)}/5 Completed`,
        theme: {
          bg: "bg-amber-50",
          border: "border-amber-300",
          text: "text-amber-950",
          iconBg: "bg-amber-500",
          ring: "ring-amber-500/30",
        },
      },

      // ---------------- BADGES ----------------
      {
        id: "flood_master",
        type: "badge",
        title: "Flood Master",
        description: "Complete all flood safety modules",
        icon: TsunamiIcon,
        isUnlocked: totalFloodCatalog > 0 && floodCompleted >= totalFloodCatalog,
        progressText: `${floodCompleted}/${Math.max(1, totalFloodCatalog)} Completed`,
        theme: {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-900",
          iconBg: "bg-blue-500",
          ring: "ring-blue-500/20",
        },
      },
      {
        id: "earthquake_expert",
        type: "badge",
        title: "Earthquake Expert",
        description: "Complete all earthquake response modules",
        icon: Alert01Icon,
        isUnlocked: totalEarthquakeCatalog > 0 && earthquakeCompleted >= totalEarthquakeCatalog,
        progressText: `${earthquakeCompleted}/${Math.max(1, totalEarthquakeCatalog)} Completed`,
        theme: {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-900",
          iconBg: "bg-amber-500",
          ring: "ring-amber-500/20",
        },
      },
      {
        id: "fire_safety",
        type: "badge",
        title: "Fire Safety Vanguard",
        description: "Complete all fire prevention modules",
        icon: FlameIcon,
        isUnlocked: totalFireCatalog > 0 && fireCompleted >= totalFireCatalog,
        progressText: `${fireCompleted}/${Math.max(1, totalFireCatalog)} Completed`,
        theme: {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-900",
          iconBg: "bg-red-500",
          ring: "ring-red-500/20",
        },
      },
      {
        id: "foundation_start",
        type: "badge",
        title: "Knowing the Fundamentals",
        description: "Complete all Fundamental modules",
        icon: Shield02Icon,
        isUnlocked: totalFundamentalCatalog > 0 && fundamentalCompleted >= totalFundamentalCatalog,
        progressText: `${fundamentalCompleted}/${Math.max(1, totalFundamentalCatalog)} Completed`,
        theme: {
          bg: "bg-rose-50",
          border: "border-rose-200",
          text: "text-rose-900",
          iconBg: "bg-rose-500",
          ring: "ring-rose-500/20",
        },
      },
    ];

    const earned = badgeDefinitions.filter((b) => b.isUnlocked).length;

    return {
      achievements: badgeDefinitions.filter((d) => d.type === 'achievement'),
      badges: badgeDefinitions.filter((d) => d.type === 'badge'),
      earnedCount: earned,
      totalCount: badgeDefinitions.length,
    };
  }, [enrolledModules, categoryTotals]);

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm h-full flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Award02Icon} className="h-6 w-6 text-yellow-500" />
            Achievements & Badges
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-yellow-50 text-yellow-800 border border-yellow-200">
            {earnedCount} of {totalCount} Unlocked
          </span>
        </div>


        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Global Achievements</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((item) => {
              const Icon = item.icon;

              if (item.isUnlocked) {
                return (
                  <div key={item.id} className={`relative p-3 rounded-2xl border ${item.theme.border} ${item.theme.bg} transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}>
                    <div className="flex items-center gap-3">

                      <div className={`w-12 h-12 rounded-lg shrink-0 shadow-sm ring-2 ${item.theme.ring} overflow-hidden bg-black/5 flex items-center justify-center`}>
                        {typeof Icon === "string" ? (
                          <img src={Icon} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${item.theme.iconBg} text-white`}>
                            <HugeiconsIcon icon={Icon} className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 flex justify-between items-center gap-2">
                        <div className="min-w-0">
                          <p className={`text-sm font-bold truncate ${item.theme.text}`}>{item.title}</p>
                          <p className="text-xs text-gray-500 font-medium line-clamp-1 mt-0.5">{item.description}</p>
                        </div>
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5 text-emerald-600 shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              }

              // Locked Achievement
              return (
                <div key={item.id} className="relative p-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 opacity-75 transition-all duration-300 hover:opacity-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-200 text-gray-400 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={LockKeyIcon} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1 flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-600 truncate">{item.title}</p>
                        <p className="text-xs text-gray-400 font-medium line-clamp-1 mt-0.5">{item.progressText}</p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Locked</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- BADGES SECTION (GRID STYLE) --- */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Course Badges</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {badges.map((badge) => {
              const Icon = badge.icon;

              if (badge.isUnlocked) {
                return (
                  <div key={badge.id} className={`relative p-3.5 rounded-2xl border ${badge.theme.border} ${badge.theme.bg} transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${badge.theme.iconBg} flex items-center justify-center text-white shrink-0 shadow-sm ring-4 ${badge.theme.ring}`}>
                        {typeof Icon === "string" ? (
                          <img src={Icon} alt={badge.title} className="w-5 h-5 object-contain" />
                        ) : (
                          <HugeiconsIcon icon={Icon} className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-sm font-bold truncate ${badge.theme.text}`}>{badge.title}</p>
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 text-emerald-600 shrink-0" />
                        </div>
                        <p className="text-xs text-gray-500 font-medium line-clamp-1 mt-0.5">{badge.description}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              // Locked Badge
              return (
                <div key={badge.id} className="relative p-3.5 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 opacity-75 transition-all duration-300 hover:opacity-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-400 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={LockKeyIcon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-bold text-gray-600 truncate">{badge.title}</p>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Locked</span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium line-clamp-1 mt-0.5">{badge.progressText}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Certificate Link Footer */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <HugeiconsIcon icon={Certificate01Icon} className="w-4 h-4 text-red-600" />
          <span>Accredited DRRM Certificates</span>
        </div>
        <Link
          to="/user/certificates"
          className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
        >
          View Certificates
          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
