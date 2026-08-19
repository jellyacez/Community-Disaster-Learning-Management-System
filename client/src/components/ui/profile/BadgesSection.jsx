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
  BookOpen01Icon,
  Shield01Icon,
  LockKeyIcon,
  Certificate01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

export default function BadgesSection({ enrolledModules }) {
  const { allBadges, earnedCount } = useMemo(() => {
    if (!enrolledModules) return { allBadges: [], earnedCount: 0 };

    const totalCompleted = enrolledModules.filter((m) => m.progress === 100).length;

    // Track categorizations (case-insensitive)
    const floodModules = enrolledModules.filter((m) =>
      m.category?.toLowerCase().includes("flood")
    );
    const floodCompleted = floodModules.filter((m) => m.progress === 100);

    const earthquakeModules = enrolledModules.filter((m) =>
      m.category?.toLowerCase().includes("earthquake")
    );
    const earthquakeCompleted = earthquakeModules.filter((m) => m.progress === 100);

    const fireModules = enrolledModules.filter((m) =>
      m.category?.toLowerCase().includes("fire")
    );
    const fireCompleted = fireModules.filter((m) => m.progress === 100);

    const badgeDefinitions = [
      {
        id: "first_module",
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
        id: "flood_master",
        title: "Flood Master",
        description: "Complete all flood safety modules",
        icon: TsunamiIcon,
        isUnlocked: floodModules.length > 0 && floodCompleted.length === floodModules.length,
        progressText: `${floodCompleted.length}/${Math.max(1, floodModules.length)} Completed`,
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
        title: "Earthquake Expert",
        description: "Complete all earthquake response modules",
        icon: Alert01Icon,
        isUnlocked:
          earthquakeModules.length > 0 &&
          earthquakeCompleted.length === earthquakeModules.length,
        progressText: `${earthquakeCompleted.length}/${Math.max(1, earthquakeModules.length)} Completed`,
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
        title: "Fire Safety Vanguard",
        description: "Complete all fire prevention modules",
        icon: FlameIcon,
        isUnlocked: fireModules.length > 0 && fireCompleted.length === fireModules.length,
        progressText: `${fireCompleted.length}/${Math.max(1, fireModules.length)} Completed`,
        theme: {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-900",
          iconBg: "bg-red-500",
          ring: "ring-red-500/20",
        },
      },
      {
        id: "disaster_scholar",
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
        id: "community_champion",
        title: "Community Champion",
        description: "Complete 5 or more total modules",
        icon: Shield01Icon,
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
    ];

    const count = badgeDefinitions.filter((b) => b.isUnlocked).length;
    return { allBadges: badgeDefinitions, earnedCount: count };
  }, [enrolledModules]);

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm h-full flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Award02Icon} className="h-6 w-6 text-yellow-500" />
            Badges & Achievements
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-yellow-50 text-yellow-800 border border-yellow-200">
            {earnedCount} of {allBadges.length} Unlocked
          </span>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allBadges.map((badge) => {
            const Icon = badge.icon;
            if (badge.isUnlocked) {
              return (
                <div
                  key={badge.id}
                  className={`relative p-3.5 rounded-2xl border ${badge.theme.border} ${badge.theme.bg} transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${badge.theme.iconBg} flex items-center justify-center text-white shrink-0 shadow-sm ring-4 ${badge.theme.ring}`}
                    >
                      <HugeiconsIcon icon={Icon} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-sm font-bold truncate ${badge.theme.text}`}>
                          {badge.title}
                        </p>
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          className="w-4 h-4 text-emerald-600 shrink-0"
                        />
                      </div>
                      <p className="text-xs text-gray-500 font-medium line-clamp-1 mt-0.5">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // Locked Badge
            return (
              <div
                key={badge.id}
                className="relative p-3.5 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 opacity-75 transition-all duration-300 hover:opacity-100"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-400 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={LockKeyIcon} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-bold text-gray-600 truncate">
                        {badge.title}
                      </p>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Locked
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium line-clamp-1 mt-0.5">
                      {badge.progressText}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
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
