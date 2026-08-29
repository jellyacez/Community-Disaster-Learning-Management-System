import React from "react";
import PropTypes from "prop-types";

export default function CommunityComplianceCard({
  preparednessRate,
  certifiedCount,
  pendingCount,
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-4 flex flex-col justify-between">
      <div className="border-b border-gray-100 pb-3">
        <h3 className="text-sm font-bold text-gray-900">Community Safety Compliance</h3>
        <p className="text-xs text-gray-400 mt-0.5">Ratio of certified vs uncertified citizens</p>
      </div>

      <div className="my-auto py-4 flex flex-col items-center justify-center relative">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-100"
              strokeWidth="3.8"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-emerald-500"
              strokeDasharray={`${preparednessRate}, 100`}
              strokeWidth="3.8"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-black font-mono text-gray-900">{preparednessRate}%</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Certified</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-gray-600 font-medium">{certifiedCount} Certified</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <span className="text-gray-600 font-medium">{pendingCount} Pending</span>
        </div>
      </div>
    </div>
  );
}

CommunityComplianceCard.propTypes = {
  preparednessRate: PropTypes.number.isRequired,
  certifiedCount: PropTypes.number.isRequired,
  pendingCount: PropTypes.number.isRequired,
};
