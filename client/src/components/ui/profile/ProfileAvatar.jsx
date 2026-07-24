import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "../../../lib/auth-client";
import toast from "react-hot-toast";
import { compressImage } from "../../../utils/imageUtils";
import { saveOfflineAvatarChange } from "../../../lib/LocalSave/progressService";

export default function ProfileAvatar({ currentUser, userInitials }) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const compressedBase64 = await compressImage(file, 150, 0.7);


      if (!navigator.onLine) {
        await saveOfflineAvatarChange(currentUser.id, compressedBase64);
        toast.success("Offline: Profile picture saved locally.");

        // Force TanStack Query to refresh the UI with the local Dexie data
        queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
        return;
      }

      // 3. Online Execution: Send to backend
      const { error } = await authClient.updateUser({
        image: compressedBase64
      });

      if (error) {
        // Fallback in case of mid-upload network drop
        if (error.message?.includes('network') || error.code === 'ERR_NETWORK') {
          await saveOfflineAvatarChange(currentUser.id, compressedBase64);
          toast.success("Network dropped. Saved locally instead.");
          queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
        } else {
          toast.error(error.message || "Failed to update profile picture.");
        }
      } else {
        toast.success("Profile picture updated successfully!");
        queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
        queryClient.invalidateQueries({ queryKey: ["session"] });
      }

    } catch (err) {
      toast.error(err.message || "Failed to process image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <div className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-red-100 text-3xl font-extrabold text-red-700">
          {currentUser?.image ? (
            <img
              src={currentUser.image}
              alt="User profile"
              className="h-full w-full object-cover"
            />
          ) : (
            userInitials
          )}
          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="text-xs font-semibold text-white">{isUploading ? "..." : "Change"}</span>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={isUploading} />
          </label>
        </div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">
          {currentUser.name}
        </h2>
        <p className="text-sm text-gray-500">{currentUser.role}</p>
        <label className={`mt-4 cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${isUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>
          {isUploading ? "Uploading..." : "Change Picture"}
          <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={isUploading} />
        </label>
      </div>
    </div>
  );
}
