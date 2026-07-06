import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserCircle02Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "../../lib/auth-client";
import toast from "react-hot-toast";

export default function ProfilePreferences({ currentUser }) {
  const [name, setName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (currentUser?.name) {
      setName(currentUser.name);
    }
  }, [currentUser, setName]);

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
    <div className="p-6 md:p-8 w-full flex flex-col space-y-2">
      {/* Display Name Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 flex-shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={UserCircle02Icon} className="w-5 h-5 text-red-500" />
            <label htmlFor="displayName">Display Name</label>
          </h4>
          <p className="text-sm text-gray-500 mt-1">This is how you will appear to other users on the platform.</p>
        </div>
        <div className="md:w-2/3 max-w-md">
          <input
            id="displayName"
            name="displayName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-red-400"
          />
        </div>
      </div>

      {/* Email Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 flex-shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Mail01Icon} className="w-5 h-5 text-red-500" />
            <label htmlFor="emailAddress">Email Address</label>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider ml-1">
              Uneditable
            </span>
          </h4>
          <p className="text-sm text-gray-500 mt-1">Your email cannot be changed for security reasons.</p>
        </div>
        <div className="md:w-2/3 max-w-md">
          <input
            id="emailAddress"
            name="emailAddress"
            type="email"
            value={currentUser?.email || ""}
            disabled
            readOnly
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
          />
        </div>
      </div>

      {/* Save Button Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16">
        <div className="md:w-1/3 flex-shrink-0"></div>
        <div className="md:w-2/3 max-w-md flex justify-end">
          <button 
            onClick={handleUpdateProfile}
            disabled={isUpdating}
            className={`flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-colors active:scale-95 ${
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
