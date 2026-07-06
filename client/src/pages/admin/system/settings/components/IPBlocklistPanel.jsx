import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon, PlusSignIcon, Delete01Icon } from "@hugeicons/core-free-icons";

export default function IPBlocklistPanel() {
  const queryClient = useQueryClient();
  const [ipAddress, setIpAddress] = useState("");
  const [reason, setReason] = useState("");

  const { data: blockedIps, isLoading } = useQuery({
    queryKey: ["blockedIps"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/security/blocked-ips");
      return res.data.data;
    },
  });

  const addIpMutation = useMutation({
    mutationFn: async (data) => {
      return apiClient.post("/admin/security/blocked-ips", data);
    },
    onSuccess: () => {
      toast.success("IP address blocked successfully");
      setIpAddress("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["blockedIps"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to block IP");
    },
  });

  const removeIpMutation = useMutation({
    mutationFn: async (id) => {
      return apiClient.delete(`/admin/security/blocked-ips/${id}`);
    },
    onSuccess: () => {
      toast.success("IP address unblocked successfully");
      queryClient.invalidateQueries({ queryKey: ["blockedIps"] });
    },
    onError: () => {
      toast.error("Failed to unblock IP");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ipAddress) return;
    addIpMutation.mutate({ ip_address: ipAddress, reason });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-red-600" />
        <h2 className="text-base font-bold text-gray-900">Security & IP Blacklisting</h2>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        Manage the global IP blocklist. Connections from these addresses will be rejected before reaching application logic.
      </p>

      {/* Add New IP Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="IP Address (e.g., 192.168.1.50)"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            required
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Reason (Optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
        <button
          type="submit"
          disabled={addIpMutation.isLoading || !ipAddress}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="w-4 h-4" />
          Block IP
        </button>
      </form>

      {/* Blocked IPs Table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
        <table className="w-full text-left text-sm">
          <thead className="bg-white border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600">IP Address</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Reason</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Date Blocked</th>
              <th className="px-4 py-3 font-semibold text-right text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
                </td>
              </tr>
            ) : blockedIps?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 font-medium">
                  No IP addresses are currently blocked.
                </td>
              </tr>
            ) : (
              blockedIps?.map((ip) => (
                <tr key={ip.id} className="hover:bg-white transition-colors">
                  <td className="px-4 py-3 font-mono text-red-600">{ip.ip_address}</td>
                  <td className="px-4 py-3 text-gray-600">{ip.reason || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(ip.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeIpMutation.mutate(ip.id)}
                      disabled={removeIpMutation.isLoading}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Remove block"
                    >
                      <HugeiconsIcon icon={Delete01Icon} className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
