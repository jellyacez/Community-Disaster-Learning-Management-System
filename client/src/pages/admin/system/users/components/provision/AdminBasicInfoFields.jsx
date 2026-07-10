import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, Mail02Icon } from "@hugeicons/core-free-icons";

export default function AdminBasicInfoFields({ formData, setFormData }) {
  return (
    <>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Full Name
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <HugeiconsIcon icon={UserIcon} size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            placeholder="Juan Dela Cruz"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <HugeiconsIcon icon={Mail02Icon} size={18} className="text-gray-400" />
          </div>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            placeholder="juan@bacolor.gov.ph"
          />
        </div>
      </div>
    </>
  );
}
