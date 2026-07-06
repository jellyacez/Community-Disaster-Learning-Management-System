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
    <div className="p-6 md:p-8 w-full flex flex-col space-y-2">
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 flex-shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5 text-red-500" />
            Login History
          </h4>
          <p className="text-sm text-gray-500 mt-1">Review recent account activity and login attempts.</p>
        </div>
        <div className="md:w-2/3 max-w-md">
          <div className="flex flex-col space-y-4">
            {historyData.map((record) => (
              <div key={record.id} className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
                <div className="mt-1 text-gray-400">
                  <HugeiconsIcon icon={record.type === 'laptop' ? LaptopIcon : SmartPhone01Icon} className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">{record.device} &bull; {record.location}</p>
                    <span className="text-xs font-medium text-gray-400 whitespace-nowrap ml-2">{record.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{record.browser} &bull; IP: {record.ip}</p>
                </div>
              </div>
            ))}
          </div>
      </div>
      </div>
      
      {/* Footer / View Full History */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 mt-2">
        <div className="md:w-1/3 flex-shrink-0"></div>
        <div className="md:w-2/3 max-w-md flex justify-end pt-4 border-t border-gray-100">
          <button className="text-sm font-bold text-red-600 hover:text-red-700 transition">
            View Full History
          </button>
        </div>
      </div>
    </div>
  );
}
