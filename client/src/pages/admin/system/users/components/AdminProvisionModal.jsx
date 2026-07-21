import { useState } from "react";
import { UserAdd01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";

import AdminBasicInfoFields from "./provision/AdminBasicInfoFields";
import AdminRoleSelection from "./provision/AdminRoleSelection";
import AdminPasswordStrategy from "./provision/AdminPasswordStrategy";

export default function AdminProvisionModal({ onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "mdrrmo_admin",
    barangay: "",
    password: "",
  });
  const [showAutoGenerate, setShowAutoGenerate] = useState(true);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      if (showAutoGenerate) {
        delete payload.password; // backend will auto-generate
      }
      const res = await apiClient.post("/admin/users/provision", payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["systemStats"] });

      toast.success(
        <div>
          <p className="font-semibold">Account Provisioned</p>
          <p className="text-sm">
            {data.generatedPassword
              ? `Auto-generated password emailed.`
              : "Account created successfully."}
          </p>
        </div>,
        { duration: 5000 },
      );

      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to provision account");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.role === "barangay_admin" && !formData.barangay) {
      return toast.error("Please select a Barangay.");
    }
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm sm:p-6">
      <div
        className="w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <HugeiconsIcon icon={UserAdd01Icon} size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Provision Admin</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <AdminBasicInfoFields formData={formData} setFormData={setFormData} />

          <AdminRoleSelection formData={formData} setFormData={setFormData} />

          <AdminPasswordStrategy
            formData={formData}
            setFormData={setFormData}
            showAutoGenerate={showAutoGenerate}
            setShowAutoGenerate={setShowAutoGenerate}
          />

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? "Provisioning..." : "Provision Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
