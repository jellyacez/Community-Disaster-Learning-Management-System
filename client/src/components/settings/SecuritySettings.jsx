import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { authClient } from "../../lib/auth-client";
import PasswordInput from "../ui/inputs/PasswordInput";
import ConfirmationModal from "../ui/modals/ConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockKeyIcon } from "@hugeicons/core-free-icons";

export default function SecuritySettings() {
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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

  const handlePasswordChange = (e) => {
    setPasswordData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (passwordErrors[e.target.name]) {
      setPasswordErrors((prev) => ({ ...prev, [e.target.name]: null }));
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordErrors({});

    let errors = {};
    if (!passwordData.currentPassword) errors.currentPassword = "Required";

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*_=+-/.]).{8,}$/;
    if (!passwordRegex.test(passwordData.newPassword)) {
      errors.newPassword =
        "Must be 8+ characters and include an uppercase letter and a symbol.";
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setShowConfirmModal(true);
  };

  const executePasswordChange = async () => {
    setShowConfirmModal(false);
    setIsUpdatingPassword(true);
    const { data, error } = await authClient.changePassword({
      newPassword: passwordData.newPassword,
      currentPassword: passwordData.currentPassword,
      revokeOtherSessions: true,
    });
    setIsUpdatingPassword(false);

    if (error) {
      if (error.status === 403) {
        toast.error(
          error.message ||
            "You cannot change your password again within 24 hours.",
        );
      } else {
        toast.error(
          error.message || "Failed to update password. Check current password.",
        );
        setPasswordErrors({ currentPassword: "Check your current password" });
      }
    } else {
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowSuccessModal(true);
    }
  };

  return (
    <>
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

        {isGoogleUser && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-5 h-5 flex items-center justify-center bg-red-600 rounded">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <label className="text-sm font-semibold text-gray-700 select-none">
              Signed in with Google Account
            </label>
          </div>
        )}

        {isGoogleUser ? (
          <div className="p-6 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl text-center shadow-sm">
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
              Since you securely signed in using your Google account, you do not have (or need) a password on our platform. Your account is protected by Google's security!
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              label="Current Password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.currentPassword}
            />
            <PasswordInput
              id="newPassword"
              name="newPassword"
              label="New Password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.newPassword}
            />
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm New Password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.confirmPassword}
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className={`flex items-center justify-center w-full md:w-auto rounded-xl border px-6 py-3.5 text-sm font-bold transition-all ${
                  isUpdatingPassword
                    ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border-red-200 text-red-600 hover:bg-red-50 active:scale-95"
                }`}
              >
                {isUpdatingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executePasswordChange}
        title="Change Password?"
        description="Are you sure you want to change your password? For your security, you will be locked from changing it again via Settings for 24 hours."
        type="warning"
        confirmText="Update Password"
        cancelText="Cancel"
      />

      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onConfirm={() => setShowSuccessModal(false)}
        title="Password Changed Successfully!"
        description="Your password has been securely updated. A confirmation email has also been sent to your registered email address."
        type="success"
        confirmText="Done"
        cancelText="Close"
      />
    </>
  );
}
