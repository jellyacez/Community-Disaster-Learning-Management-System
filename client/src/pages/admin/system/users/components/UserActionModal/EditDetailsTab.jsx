import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon, Notification01Icon } from "@hugeicons/core-free-icons";

export default function EditDetailsTab({ user, onSave }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ type: "edit", userId: user.id, data: { name, email } });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
        <div className="relative">
          <HugeiconsIcon icon={UserGroupIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            placeholder="Full name"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
        <div className="relative">
          <HugeiconsIcon icon={Notification01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            placeholder="Email"
          />
        </div>
      </div>
      <div className="pt-2">
        <button type="submit" className="w-full rounded-xl bg-gray-900 text-white py-3 text-sm font-bold hover:bg-black transition-colors">
          Save Changes
        </button>
      </div>
    </form>
  );
}
