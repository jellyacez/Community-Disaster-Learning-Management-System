import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  QrCodeIcon, 
  Notification01Icon, 
  UserGroupIcon, 
  Award01Icon, 
  Message01Icon, 
  ArrowRight01Icon 
} from "@hugeicons/core-free-icons";

export default function WorkspaceQuickActions({
  onOpenVerifyModal,
  onOpenAnnouncementModal,
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] lg:col-span-3 flex flex-col justify-between">
      <div className="pb-3 border-b border-gray-100 mb-3">
        <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
        <p className="text-xs text-gray-400 mt-0.5">Barangay administrative tools</p>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-2">
        {/* Verify Certificate */}
        <button
          type="button"
          onClick={onOpenVerifyModal}
          className="group w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200/70 bg-gray-50/40 hover:bg-white hover:border-gray-300 hover:shadow-2xs transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center shrink-0 text-gray-600 group-hover:text-gray-950 group-hover:border-gray-300 shadow-2xs transition-colors">
              <HugeiconsIcon icon={QrCodeIcon} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-900 group-hover:text-black truncate">Verify Certificate</div>
              <div className="text-[11px] text-gray-400 truncate mt-0.5">Validate resident QR or serial</div>
            </div>
          </div>
          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
        </button>

        {/* Post Announcement (Primary High-Priority Action) */}
        <button
          type="button"
          onClick={onOpenAnnouncementModal}
          className="group w-full flex items-center justify-between p-2.5 rounded-xl border border-red-200/90 bg-red-50/60 hover:bg-red-50 hover:border-red-300 hover:shadow-2xs transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-600 border border-red-600 flex items-center justify-center shrink-0 text-white shadow-2xs transition-colors">
              <HugeiconsIcon icon={Notification01Icon} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-red-950 group-hover:text-red-900 truncate">Post Announcement</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-red-200/70 text-red-800 shrink-0">Priority</span>
              </div>
              <div className="text-[11px] text-red-700/80 truncate mt-0.5">Broadcast sector advisory</div>
            </div>
          </div>
          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 text-red-500 group-hover:text-red-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
        </button>

        {/* Manage Residents */}
        <button
          type="button"
          onClick={() => navigate("/admin/barangay/residents")}
          className="group w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200/70 bg-gray-50/40 hover:bg-white hover:border-gray-300 hover:shadow-2xs transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center shrink-0 text-gray-600 group-hover:text-gray-950 group-hover:border-gray-300 shadow-2xs transition-colors">
              <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-900 group-hover:text-black truncate">Resident Directory</div>
              <div className="text-[11px] text-gray-400 truncate mt-0.5">Manage jurisdiction records</div>
            </div>
          </div>
          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
        </button>

        {/* Certification Roster */}
        <button
          type="button"
          onClick={() => navigate("/admin/barangay/certifications")}
          className="group w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200/70 bg-gray-50/40 hover:bg-white hover:border-gray-300 hover:shadow-2xs transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center shrink-0 text-gray-600 group-hover:text-gray-950 group-hover:border-gray-300 shadow-2xs transition-colors">
              <HugeiconsIcon icon={Award01Icon} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-900 group-hover:text-black truncate">Certification Roster</div>
              <div className="text-[11px] text-gray-400 truncate mt-0.5">Review certified locals</div>
            </div>
          </div>
          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
        </button>

        {/* Resident Feedback */}
        <button
          type="button"
          onClick={() => navigate("/admin/barangay/feedback")}
          className="group w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200/70 bg-gray-50/40 hover:bg-white hover:border-gray-300 hover:shadow-2xs transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center shrink-0 text-gray-600 group-hover:text-gray-950 group-hover:border-gray-300 shadow-2xs transition-colors">
              <HugeiconsIcon icon={Message01Icon} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-900 group-hover:text-black truncate">Resident Feedback</div>
              <div className="text-[11px] text-gray-400 truncate mt-0.5">Inquiries & community reports</div>
            </div>
          </div>
          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
        </button>
      </div>
    </div>
  );
}

WorkspaceQuickActions.propTypes = {
  onOpenVerifyModal: PropTypes.func.isRequired,
  onOpenAnnouncementModal: PropTypes.func.isRequired,
};
