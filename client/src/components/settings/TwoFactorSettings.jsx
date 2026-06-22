import React, { useState } from "react";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";
import MfaSetupModal from "../ui/modals/MfaSetupModal";

export default function TwoFactorSettings() {
  const { data: session } = authClient.useSession();
  const isCurrentlyEnabled = session?.user?.twoFactorEnabled;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(""); // "enable" or "disable"

  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleToggleClick = () => {
    setModalMode(isCurrentlyEnabled ? "disable" : "enable");
    setPassword("");
    setTotpURI("");
    setBackupCodes([]);
    setIsModalOpen(true);
  };

  const handleEnableMFA = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error("Password is required");
      return;
    }
    setIsGenerating(true);
    const { data, error } = await authClient.twoFactor.enable({ password });
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
    if (!password) {
      toast.error("Password is required");
      return;
    }
    setIsGenerating(true);
    const { error } = await authClient.twoFactor.disable({ password });
    setIsGenerating(false);
    
    if (error) {
      toast.error(error.message || "Failed to disable MFA.");
    } else {
      toast.success("MFA Disabled.");
      setIsModalOpen(false);
      window.location.reload();
    }
  };

  const handleDone = () => {
    setIsModalOpen(false);
    window.location.reload();
  };

  return (
    <>
      <div className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-50 p-2.5 rounded-xl text-red-600">
              <HugeiconsIcon icon={Shield01Icon} className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Two-Factor Auth</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isCurrentlyEnabled ? "MFA is currently enabled" : "Add an extra layer of security."}
              </p>
            </div>
          </div>
          
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
        </div>
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
