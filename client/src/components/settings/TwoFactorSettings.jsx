import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import axios from "axios";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";
import MfaSetupModal from "../ui/modals/mfa/MfaSetupModal";
import { useQueryClient } from "@tanstack/react-query";

export default function TwoFactorSettings() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const isCurrentlyEnabled = session?.user?.twoFactorEnabled;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(""); // "enable" or "disable"

  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

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

  const handleToggleClick = () => {
    setModalMode(isCurrentlyEnabled ? "disable" : "enable");
    setPassword("");
    setTotpURI("");
    setBackupCodes([]);
    setIsModalOpen(true);
  };

  const handleEnableMFA = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    const { data, error } = await authClient.twoFactor.enable({ password: password || "" });
    setIsGenerating(false);

    if (error) {
      toast.error(error.message || "Failed to verify password.");
    } else if (data) {
      setTotpURI(data.totpURI);
      if (data.backupCodes) setBackupCodes(data.backupCodes);
      toast.success("MFA Setup Started! Scan the QR code.");
    }
  };

  const handleDisableMFA = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    const { error } = await authClient.twoFactor.disable({ password: password || "" });
    setIsGenerating(false);
    
    if (error) {
      toast.error(error.message || "Failed to disable MFA.");
    } else {
      toast.success("MFA Disabled.");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  };

  const handleDone = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    }, 1500);
  };

  return (
    <>
      <div className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-50 p-2.5 rounded-xl text-red-600">
              <HugeiconsIcon aria-hidden="true" icon={Shield01Icon} className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Two-Factor Auth</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isCurrentlyEnabled ? "MFA is currently enabled" : "Add an extra layer of security."}
              </p>
            </div>
          </div>
          
          {!isGoogleUser && (
            <button
              onClick={handleToggleClick}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 ${
                isCurrentlyEnabled ? "bg-red-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isCurrentlyEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          )}
        </div>

        {isGoogleUser && (
          <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl text-center shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <h3 className="text-blue-900 font-bold">Google OAuth Account</h3>
            </div>
            <p className="text-sm text-blue-800/80 leading-relaxed max-w-sm mx-auto">
              Since you signed in securely with Google, your account is protected by Google's own internal Two-Factor Authentication. Internal MFA is disabled for social accounts.
            </p>
          </div>
        )}
      </div>

      <MfaSetupModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        modalMode={modalMode}
        totpURI={totpURI}
        backupCodes={backupCodes}
        password={password}
        setPassword={setPassword}
        isGenerating={isGenerating}
        onEnable={handleEnableMFA}
        onDisable={handleDisableMFA}
        onDone={handleDone}
      />
    </>
  );
}
