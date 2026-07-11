import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, TextFontIcon, ContactBookIcon } from "@hugeicons/core-free-icons";

export default function OrganizationDetailsPanel({ settingsData }) {
  const queryClient = useQueryClient();
  
  const [supportEmail, setSupportEmail] = useState("");
  const [orgFooterText, setOrgFooterText] = useState("");

  useEffect(() => {
    if (settingsData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupportEmail(settingsData.support_email || "");
      setOrgFooterText(settingsData.org_footer_text || "Community DRRM System - Bacolor, Pampanga.");
    }
  }, [settingsData]);

  const updateDetails = useMutation({
    mutationFn: async () => {
      return apiClient.patch("/admin/settings/organization", {
        support_email: supportEmail,
        org_footer_text: orgFooterText,
      });
    },
    onSuccess: () => {
      toast.success("Organization details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: () => {
      toast.error("Failed to update organization details.");
    },
  });

  const hasChanges = 
    supportEmail !== (settingsData?.support_email || "") ||
    orgFooterText !== (settingsData?.org_footer_text || "Community DRRM System - Bacolor, Pampanga.");

  const handleSubmit = (e) => {
    e.preventDefault();
    updateDetails.mutate();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={ContactBookIcon} className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Organization Details</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Public-facing contact information and footer texts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">
            Public Support Email
          </label>
          <p className="text-xs text-gray-500 mb-2">
            The email address displayed to users for inquiries and support.
          </p>
          <div className="relative">
            <HugeiconsIcon icon={Mail01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="e.g. support@drrmbacolor.gov.ph"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">
            Email Footer Text
          </label>
          <p className="text-xs text-gray-500 mb-2">
            The copyright/organization name displayed at the bottom of all automated system emails.
          </p>
          <div className="relative">
            <HugeiconsIcon icon={TextFontIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={orgFooterText}
              onChange={(e) => setOrgFooterText(e.target.value)}
              placeholder="e.g. Community DRRM System - Bacolor, Pampanga."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100/50 mt-2">
          <button
            type="submit"
            disabled={!hasChanges || updateDetails.isLoading}
            className="flex items-center justify-center px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateDetails.isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
            {updateDetails.isLoading ? "Saving..." : "Save Details"}
          </button>
        </div>
      </form>
    </div>
  );
}
