import React, { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserCircle02Icon } from "@hugeicons/core-free-icons";
import { authClient } from "../../lib/auth-client";
import toast from "react-hot-toast";

export default function ProfilePreferences({ currentUser }) {
  const [name, setName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (currentUser?.name) {
      setName(currentUser.name);
    }
  }, [currentUser]);

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      return toast.error("Display name cannot be empty.");
    }
    if (name === currentUser?.name) {
      return toast.error("No changes made to display name.");
    }

    setIsUpdating(true);
    const { error } = await authClient.updateUser({ name });
    setIsUpdating(false);

    if (error) {
      toast.error(error.message || "Failed to update profile.");
    } else {
      toast.success("Profile updated successfully!");
    }
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-50 p-2.5 rounded-xl text-red-600">
          <HugeiconsIcon aria-hidden="true" icon={UserCircle02Icon} className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Profile Preferences</h2>
      </div>
      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-red-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 flex items-center gap-2">
            Email Address{" "}
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">
              Uneditable
            </span>
          </label>
          <input
            type="email"
            value={currentUser?.email || ""}
            disabled
            readOnly
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Your email address cannot be changed for security reasons.
          </p>
        </div>
        <div className="pt-2">
          <button 
            onClick={handleUpdateProfile}
            disabled={isUpdating}
            className={`flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-colors active:scale-95 ${
              isUpdating ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
