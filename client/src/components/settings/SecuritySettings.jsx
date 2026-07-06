import { useState, useEffect } from "react";
import apiClient from "../../lib/apiClient";
import { authClient } from "../../lib/auth-client";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockKeyIcon } from "@hugeicons/core-free-icons";
import GoogleOAuthBanner from "./security/GoogleOAuthBanner";
import PasswordUpdateForm from "./security/PasswordUpdateForm";

export default function SecuritySettings() {
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const { data: session } = authClient.useSession();
  
  let isCooldownActive = false;
  let availableDateText = "";

  if (session?.user?.lastPasswordChange) {
    const changeDate = new Date(session.user.lastPasswordChange);
    const availableDate = new Date(changeDate.getTime() + 24 * 60 * 60 * 1000);
    if (availableDate > new Date()) {
      isCooldownActive = true;
      const isTomorrow = availableDate.getDate() !== new Date().getDate();
      const timeString = availableDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      availableDateText = `Available ${isTomorrow ? "tomorrow" : "today"} at ${timeString}`;
    }
  }

  useEffect(() => {
    const checkProvider = async () => {
      try {
        const res = await apiClient.get('/users/me/provider');
        const providers = res.data.providers || [];
        if (providers.includes("google") && !providers.includes("credential")) {
          setIsGoogleUser(true);
        }
      } catch (err) {
        console.error("Failed to fetch auth provider", err);
      }
    };
    checkProvider();
  }, []);

  return (
    <div className="p-6 md:p-8 w-full flex flex-col space-y-2">
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors group">
        <div className="md:w-1/3 flex-shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={LockKeyIcon} className="w-5 h-5 text-red-500" />
            Change Password
          </h4>
          <p className="text-sm text-gray-500 mt-1">Update your password regularly to keep your account secure.</p>
        </div>
        <div className="md:w-2/3 max-w-md">
          {isGoogleUser ? (
            <GoogleOAuthBanner />
          ) : (
            <PasswordUpdateForm 
              isCooldownActive={isCooldownActive} 
              availableDateText={availableDateText} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
