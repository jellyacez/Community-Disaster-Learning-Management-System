import BarangayDropdown from "../../../../../../components/ui/inputs/BarangayDropdown";

export default function AdminRoleSelection({ formData, setFormData }) {
  return (
    <>
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
          Admin Role
        </label>
        <div className="grid grid-cols-2 gap-3">
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
