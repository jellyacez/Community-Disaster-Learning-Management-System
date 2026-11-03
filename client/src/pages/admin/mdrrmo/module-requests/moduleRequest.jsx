
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  HelpSquareIcon,
  Clock01Icon,
  UserCircleIcon,
  Book02Icon,
} from "@hugeicons/core-free-icons";
import { decodeHtml } from "../../../../utils/textUtils";

export default function MdrrmoModuleRequests() {
  useDocumentTitle("Module Requests | MDRRMO Admin");

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [processingId, setProcessingId] = useState(null);

  const {
    data: responseData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["adminModuleRequests", activeTab],
    queryFn: async () => {
      const res = await apiClient.get(
        `/admin/module-requests?status=${activeTab}`
      );
      return res.data;
    },
  });

  const requests = Array.isArray(responseData)
    ? responseData
    : responseData?.requests || responseData?.data || [];

  const handleAcceptRequest = async (requestId, moduleTitle) => {
    if (processingId) return;

    try {
      setProcessingId(requestId);

      const res = await apiClient.post(
        `/admin/module-requests/${requestId}/approve`
      );

      if (res.data?.success || res.status === 200) {
        const assignedCode = res.data?.code;

        toast.success(
          `Request approved! ${
            assignedCode
              ? `Enrollment code (${assignedCode}) sent`
              : "Code sent"
          } to user for "${decodeHtml(moduleTitle)}".`
        );

        await queryClient.invalidateQueries({
          queryKey: ["adminModuleRequests"],
        });
      }
    } catch (err) {
      const data = err?.response?.data;
      toast.error(data?.message || "Failed to approve module request.");
    } finally {
      setProcessingId(null);
    }
  };

  const isPendingTab = activeTab === "pending";

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Module Enrollment Requests
        </h1>
        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-slate-400">
          Review user requests for module enrollment codes and view previously
          accepted requests.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                <HugeiconsIcon icon={HelpSquareIcon} className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
                  {isPendingTab ? "Pending Requests" : "Accepted Requests"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {isPendingTab
                    ? "Requests waiting for admin approval"
                    : "Requests already approved by an admin"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                aria-pressed={isPendingTab}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isPendingTab
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                Pending
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("approved")}
                aria-pressed={!isPendingTab}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  !isPendingTab
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                Accepted
              </button>
            </div>
          </div>

          <div className="mt-4">
            <span
              className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                isPendingTab
                  ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {requests.length} {isPendingTab ? "Pending" : "Accepted"}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Loading requests...
            </p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {error?.response?.data?.message ||
                error?.message ||
                "Failed to load module requests."}
            </p>
          </div>
        ) : requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Resident / User</th>
                  <th className="py-3.5 px-6">Requested Module</th>
                  <th className="py-3.5 px-6">Requested At</th>
                  <th className="py-3.5 px-6">Status</th>
                  {isPendingTab && (
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                {requests.map((req) => {
                  const reqId = req.request_id || req.id;
                  const moduleName =
                    req.module_title || req.moduleName || "Untitled Module";
                  const userName =
                    req.user_name || req.userName || "Unknown Resident";
                  const userEmail =
                    req.user_email || req.email || "No email";
                  const reqDate =
                    req.requested_at || req.createdAt || Date.now();

                  return (
                    <tr
                      key={reqId}
                      className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-slate-300 font-bold shrink-0">
                            <HugeiconsIcon
                              icon={UserCircleIcon}
                              className="w-5 h-5"
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {userName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                              {userEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <HugeiconsIcon
                            icon={Book02Icon}
                            className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0"
                          />
                          <span className="font-semibold text-gray-800 dark:text-slate-200">
                            {decodeHtml(moduleName)}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-gray-500 dark:text-slate-400 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <HugeiconsIcon
                            icon={Clock01Icon}
                            className="w-3.5 h-3.5"
                          />
                          <span>{new Date(reqDate).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {req.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="w-3.5 h-3.5"
                            />
                            Accepted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50">
                            Pending
                          </span>
                        )}
                      </td>

                      {isPendingTab && (
                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleAcceptRequest(reqId, moduleName)
                            }
                            disabled={processingId === reqId}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="w-4 h-4"
                            />
                            <span>
                              {processingId === reqId
                                ? "Approving..."
                                : "Accept"}
                            </span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center">
            <HugeiconsIcon
              icon={HelpSquareIcon}
              className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-3"
            />
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {isPendingTab
                ? "No Pending Requests"
                : "No Accepted Requests"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
              {isPendingTab
                ? "There are currently no users requesting enrollment codes. New requests will appear here."
                : "No enrollment requests have been accepted yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
