import { useState, useEffect } from "react";
import { authClient } from "../../../../lib/auth-client";
import apiClient from "../../../../lib/apiClient";
import MfaInitialChoice from "./MfaInitialChoice";
import MfaTotpSetup from "./MfaTotpSetup";
import MfaEmailSetup from "./MfaEmailSetup";
import MfaDisableForm from "./MfaDisableForm";

export default function MfaSetupModal({
  isOpen,
  onClose,
  modalMode,
  totpURI,
  backupCodes,
  password,
  setPassword,
  isGenerating,
  onEnable,
  onDisable,
  onDone,
}) {
  const [setupStep, setSetupStep] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  
  const { data: session } = authClient.useSession();
  const userEmail = session?.user?.email;

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    setSetupStep(1);
    setPassword("");
  };

  const handleClose = () => {
    setSetupStep(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h3 className="text-lg font-bold text-gray-900">
            {modalMode === "enable" ? "Set up Two-Factor Auth" : "Disable Two-Factor Auth"}
          </h3>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {modalMode === "enable" && setupStep === 0 && (
            <MfaInitialChoice 
              isGoogleUser={isGoogleUser} 
              handleSelectMethod={handleSelectMethod} 
            />
          )}

          {modalMode === "enable" && setupStep === 1 && selectedMethod === "totp" && (
            <MfaTotpSetup 
              isGoogleUser={isGoogleUser}
              setSetupStep={setSetupStep}
              password={password}
              setPassword={setPassword}
              onEnable={onEnable}
              isGenerating={isGenerating}
              totpURI={totpURI}
              backupCodes={backupCodes}
              onDone={onDone}
            />
          )}

          {modalMode === "enable" && setupStep === 1 && selectedMethod === "otp" && (
            <MfaEmailSetup 
              isGoogleUser={isGoogleUser}
              setSetupStep={setSetupStep}
              password={password}
              setPassword={setPassword}
              userEmail={userEmail}
              onDone={onDone}
            />
          )}

          {modalMode === "disable" && (
            <MfaDisableForm 
              isGoogleUser={isGoogleUser}
              onDisable={onDisable}
              password={password}
              setPassword={setPassword}
              isGenerating={isGenerating}
            />
          )}
        </div>
      </div>
    </div>
  );
}
