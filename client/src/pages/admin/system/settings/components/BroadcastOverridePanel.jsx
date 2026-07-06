import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";

export default function BroadcastOverridePanel({ settingsData }) {
  const queryClient = useQueryClient();

  const updateBroadcastMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.patch("/admin/settings/broadcast", data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Broadcast settings updated!");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: () => toast.error("Failed to update broadcast settings"),
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <HugeiconsIcon icon={Notification01Icon} className="w-5 h-5 text-gray-500" />
        <h2 className="text-base font-bold text-gray-900">Global Broadcast Override</h2>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        Push an un-dismissible, platform-wide alert that supersedes any localized barangay announcements.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          updateBroadcastMutation.mutate({
            broadcast_message: formData.get("broadcast_message"),
            broadcast_active: formData.get("broadcast_active") === "true",
          });
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="broadcast_message" className="block text-xs font-bold text-gray-700 mb-1">
            Broadcast Message
          </label>
          <textarea
            id="broadcast_message"
            name="broadcast_message"
            rows={3}
            defaultValue={settingsData?.broadcast_message || ""}
            placeholder="e.g. Critical Server Maintenance tonight at 11 PM"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-700">Status:</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="broadcast_active"
                value="false"
                defaultChecked={settingsData?.broadcast_active !== "true"}
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">Disabled</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="broadcast_active"
                value="true"
                defaultChecked={settingsData?.broadcast_active === "true"}
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-bold text-red-600">Active</span>
            </label>
          </div>
        </div>
        <div className="pt-2">
          <button
            type="submit"
            disabled={updateBroadcastMutation.isLoading}
            className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {updateBroadcastMutation.isLoading ? "Saving..." : "Update Broadcast"}
          </button>
        </div>
      </form>
    </div>
  );
}
