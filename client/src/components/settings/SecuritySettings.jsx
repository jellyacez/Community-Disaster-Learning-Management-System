import React, { useState, useEffect } from "react";
import axios from "axios";
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
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/users/me/provider`, {
          withCredentials: true,
        });
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
    <div className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-50 p-2.5 rounded-xl text-red-600">
          <HugeiconsIcon aria-hidden="true" icon={LockKeyIcon} className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Security</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Change your password to keep your account secure.
          </p>
        </div>
      </div>

      {isGoogleUser ? (
        <GoogleOAuthBanner />
      ) : (
        <PasswordUpdateForm 
          isCooldownActive={isCooldownActive} 
          availableDateText={availableDateText} 
        />
      )}
    </div>
  );
}
