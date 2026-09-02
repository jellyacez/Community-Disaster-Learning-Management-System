import React from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, LaptopIcon, SmartPhone01Icon } from "@hugeicons/core-free-icons";

function parseDevice(userAgent = "") {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
    return {
      name: "Mobile Device",
      type: "mobile",
      browser: "Mobile Browser",
    };
  }
  if (/windows/.test(ua)) {
    return {
      name: "Windows PC",
      type: "laptop",
      browser: "Chrome / Web",
    };
  }
  if (/macintosh|mac os/.test(ua)) {
    return {
      name: "MacBook",
      type: "laptop",
      browser: "Safari / Web",
    };
  }
  return {
    name: "Desktop Device",
    type: "laptop",
    browser: "Browser Session",
  };
}

function formatRelativeTime(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LoginHistory() {
  const { data: sessions = [], isLoading, isError } = useQuery({
    queryKey: ["userSessions"],
    queryFn: async () => {
      const res = await apiClient.get("/users/me/sessions");
      return res.data?.sessions || [];
    },
    staleTime: 60 * 1000,
  });

  return (
    <div className="p-6 md:p-8 w-full flex flex-col space-y-2">
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5 text-red-500" />
            Login History
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            Review recent account activity and active device sessions.
          </p>
        </div>

        <div className="md:w-2/3 max-w-md">
          {isLoading && (
            <div className="flex flex-col space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-20 animate-pulse rounded-2xl border border-gray-100 bg-gray-50/70"
                />
              ))}
            </div>
          )}

          {isError && (
            <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 text-sm text-gray-500">
              Unable to load login history. Please check back later.
            </div>
          )}

          {!isLoading && !isError && sessions.length === 0 && (
            <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 text-sm text-gray-500">
              No recent session history found.
            </div>
          )}

          {!isLoading && !isError && sessions.length > 0 && (
            <div className="flex flex-col space-y-4">
              {sessions.map((record, index) => {
                const deviceInfo = parseDevice(record.user_agent);
                const isCurrent = index === 0;

                return (
                  <div
                    key={record.id || index}
                    className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50"
                  >
                    <div className="mt-1 text-gray-500">
                      <HugeiconsIcon
                        icon={deviceInfo.type === "laptop" ? LaptopIcon : SmartPhone01Icon}
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900">
                            {deviceInfo.name}
                          </p>
                          {isCurrent && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-500 whitespace-nowrap ml-2">
                          {formatRelativeTime(record.updated_at || record.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {deviceInfo.browser} &bull; IP: {record.ip_address || "Protected"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}