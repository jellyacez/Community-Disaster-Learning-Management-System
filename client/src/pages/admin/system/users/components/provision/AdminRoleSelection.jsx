import { authClient } from "../../../../../../lib/auth-client";
import BarangayDropdown from "../../../../../../components/ui/inputs/BarangayDropdown";

export default function AdminRoleSelection({ formData, setFormData }) {
  const { data: session } = authClient.useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";

  return (
    <>
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
          Admin Role
        </label>
        <div className="grid grid-cols-2 gap-3">
          {isSuperAdmin && (
            <label
              className={`relative flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-all ${
                formData.role === "super_admin"
                  ? "border-amber-500 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500"
                  : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                checked={formData.role === "super_admin"}
                onChange={() =>
                  setFormData({
                    ...formData,
                    role: "super_admin",
                    barangay: "",
                  })
                }
              />
              <span className="text-sm font-medium">Super Admin</span>
            </label>
          )}

          {isSuperAdmin && (
            <label
              className={`relative flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-all ${
                formData.role === "system_admin"
                  ? "border-red-500 dark:border-red-500 bg-red-50/50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-1 ring-red-500"
                  : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                checked={formData.role === "system_admin"}
                onChange={() =>
                  setFormData({
                    ...formData,
                    role: "system_admin",
                    barangay: "",
                  })
                }
              />
              <span className="text-sm font-medium">System Admin</span>
            </label>
          )}

          {isSuperAdmin && (
            <label
              className={`relative flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-all ${
                formData.role === "head_mdrrmo_admin"
                  ? "border-purple-500 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500"
                  : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                checked={formData.role === "head_mdrrmo_admin"}
                onChange={() =>
                  setFormData({
                    ...formData,
                    role: "head_mdrrmo_admin",
                    barangay: "",
                  })
                }
              />
              <span className="text-sm font-medium">Head MDRRMO</span>
            </label>
          )}

          <label
            className={`relative flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-all ${
              formData.role === "mdrrmo_admin"
                ? "border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
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
                ? "border-emerald-500 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500"
                : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
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
    </>
  );
}