import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, LaptopIcon, SmartPhone01Icon } from "@hugeicons/core-free-icons";

export default function LoginHistory() {
  const historyData = [
    {
      id: 1,
      device: "Windows PC",
      browser: "Chrome",
      location: "San Fernando, Pampanga",
      time: "2 hours ago",
      ip: "112.198.xxx.xx",
      type: "laptop",
      status: "success"
    },
    {
      id: 2,
      device: "iPhone 13",
      browser: "Safari",
      location: "Angeles City, Pampanga",
      time: "Yesterday, 2:45 PM",
      ip: "112.201.xxx.xx",
      type: "mobile",
      status: "success"
    },
    {
      id: 3,
      device: "MacBook Pro",
      browser: "Firefox",
      location: "Manila, NCR",
      time: "Oct 12, 10:15 AM",
      ip: "180.191.xxx.xx",
      type: "laptop",
      status: "success"
    }
  ];

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-red-50 p-2.5 rounded-xl text-red-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Login History</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Recent account activity and login attempts.
          </p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {historyData.map((record) => (
          <div key={record.id} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
            <div className="mt-1 text-gray-400">
              <HugeiconsIcon icon={record.type === 'laptop' ? LaptopIcon : SmartPhone01Icon} className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900 truncate">
                  {record.device} &bull; {record.location}
                </h3>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {record.time}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {record.browser} &bull; IP: {record.ip}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-100 text-center">
        <button className="text-sm font-bold text-red-600 hover:text-red-700 transition">
          View Full History
        </button>
      </div>
    </section>
  );
}
