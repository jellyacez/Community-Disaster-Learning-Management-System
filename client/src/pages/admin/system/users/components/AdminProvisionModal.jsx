import { useState } from "react";
import {
  UserAdd01Icon,
  Mail02Icon,
  UserIcon,
  Cancel01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import BarangayDropdown from "../../../../../components/ui/inputs/BarangayDropdown";

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
          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <HugeiconsIcon
                  icon={UserIcon}
                  size={18}
                  className="text-gray-400"
                />
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="Juan Dela Cruz"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <HugeiconsIcon
                  icon={Mail02Icon}
                  size={18}
                  className="text-gray-400"
                />
              </div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="juan@bacolor.gov.ph"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Admin Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`relative flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-all ${
                  formData.role === "mdrrmo_admin"
                    ? "border-blue-500 bg-blue-50/50 text-blue-700 ring-1 ring-blue-500"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  checked={formData.role === "mdrrmo_admin"}
                  onChange={() =>
                    setFormData({
                      ...formData,
                      role: "mdrrmo_admin",
                      barangay: "",
                    })
                  }
                />
                <span className="text-sm font-medium">MDRRMO Admin</span>
              </label>

              <label
                className={`relative flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-all ${
                  formData.role === "barangay_admin"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-1 ring-emerald-500"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  checked={formData.role === "barangay_admin"}
                  onChange={() =>
                    setFormData({ ...formData, role: "barangay_admin" })
                  }
                />
                <span className="text-sm font-medium">Barangay Admin</span>
              </label>
            </div>
          </div>

          {/* Conditional Barangay Selection */}
          {formData.role === "barangay_admin" && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <BarangayDropdown
                value={formData.barangay}
                onChange={(e) =>
                  setFormData({ ...formData, barangay: e.target.value })
                }
              />
            </div>
          )}

          {/* Password Strategy */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Password Generation
              </label>
              <button
                type="button"
                onClick={() => setShowAutoGenerate(!showAutoGenerate)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {showAutoGenerate ? "Enter manually" : "Auto-generate"}
              </button>
            </div>

            {showAutoGenerate ? (
              <div className="flex items-start gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                  <HugeiconsIcon icon={Shield01Icon} size={16} />
                </div>
                <div className="text-sm text-blue-800 leading-relaxed">
                  A cryptographically secure password will be generated and
                  emailed to the user automatically.
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HugeiconsIcon
                    icon={Shield01Icon}
                    size={18}
                    className="text-gray-400"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  placeholder="Enter temporary password"
                />
              </div>
            )}
          </div>

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
