import { useNavigate } from "react-router-dom";
import { authClient } from "../../../../../lib/auth-client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  Task01Icon,
  Shield01Icon,
  UserGroupIcon,
  Message01Icon,
  Certificate01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

export default function MdrrmoQuickActions({ pendingReviewsCount = 0 }) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const isHeadAdmin = session?.user?.role === "head_mdrrmo_admin";

  const actions = [
    {
      id: "create-module",
      title: "Create Training Module",
      description: "Author new DRRM learning syllabus",
      icon: BookOpen01Icon,
      onClick: () => navigate("/admin/mdrrmo/modules"),
    },
    ...(isHeadAdmin
      ? [
          {
            id: "pending-approvals",
            title: "Pending Approvals",
            description: "Review submitted module revisions",
            icon: Task01Icon,
            badge: pendingReviewsCount > 0 ? `${pendingReviewsCount} Pending` : null,
            badgeColor: "bg-amber-50 text-amber-700 border-amber-200/80",
            onClick: () => navigate("/admin/mdrrmo/approvals"),
          },
        ]
      : [
          {
            id: "certification-analytics",
            title: "Certification Analytics",
            description: "Track municipal certification records",
            icon: Certificate01Icon,
            onClick: () => navigate("/admin/mdrrmo/certifications"),
          },
        ]),
    {
      id: "sector-overview",
      title: "Sector Overview & Audit",
      description: "Monitor readiness across 15 barangays",
      icon: Shield01Icon,
      onClick: () => navigate("/admin/mdrrmo/sector-overview"),
    },
    {
      id: "feedback-desk",
      title: "Resident Feedback Desk",
      description: "Inquiries & safety reports desk",
      icon: Message01Icon,
      onClick: () => navigate("/admin/mdrrmo/feedback"),
    },
    {
      id: "responder-users",
      title: "Responder Directory",
      description: "Manage responder profiles & roles",
      icon: UserGroupIcon,
      onClick: () => navigate("/admin/mdrrmo/users"),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] p-6 flex flex-col h-full min-h-[360px]">
      <div className="pb-3 border-b border-gray-100 mb-3">
        <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
        <p className="text-xs text-gray-400 mt-0.5">Municipal administrative tools</p>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className="group w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200/70 bg-gray-50/40 hover:bg-white hover:border-gray-300 hover:shadow-2xs transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center shrink-0 text-gray-600 group-hover:text-gray-950 group-hover:border-gray-300 shadow-2xs transition-colors">
                <HugeiconsIcon icon={action.icon} className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-900 group-hover:text-black flex items-center gap-1.5 truncate">
                  {action.title}
                  {action.badge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${action.badgeColor}`}>
                      {action.badge}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 truncate mt-0.5">
                  {action.description}
                </div>
              </div>
            </div>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
