import React, { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { authClient } from "../../../lib/auth-client";
import PasswordInput from "../../ui/inputs/PasswordInput";
import ConfirmationModal from "../../ui/modals/ConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockKeyIcon } from "@hugeicons/core-free-icons";

export default function PasswordUpdateForm({ isCooldownActive, availableDateText }) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handlePasswordChange = useCallback((e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setPasswordErrors((prev) => {
      if (prev[name]) return { ...prev, [name]: null };
      return prev;
    });
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordErrors({});

    let errors = {};
    if (!passwordData.currentPassword) errors.currentPassword = "Required";
    if (!passwordData.newPassword) errors.newPassword = "Required";
    if (!passwordData.confirmPassword) errors.confirmPassword = "Required";

    if (passwordData.newPassword) {
      const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*_=+-/.]).{8,}$/;
      if (!passwordRegex.test(passwordData.newPassword)) {
        errors.newPassword = "Must be 8+ characters and include an uppercase letter and a symbol.";
      }
    }

    if (passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword) {
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
    const { error } = await authClient.changePassword({
      newPassword: passwordData.newPassword,
      currentPassword: passwordData.currentPassword,
      revokeOtherSessions: true,
    });
    setIsUpdatingPassword(false);

    if (error) {
      if (error.status === 403) {
        toast.error(error.message || "You cannot change your password again within 24 hours.");
      } else {
        toast.error(error.message || "Failed to update password. Check current password.");
        setPasswordErrors({ currentPassword: "Check your current password" });
      }
    } else {
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowSuccessModal(true);
    }
  };

  return (
    <>
      <form onSubmit={handleUpdatePassword} className="space-y-5" noValidate>
        <div className="space-y-3">
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
        </div>

        <div className="flex flex-col items-end pt-2">
          <button
            type="submit"
            disabled={isUpdatingPassword || isCooldownActive}
            className={`flex items-center justify-center w-full md:w-auto rounded-xl border px-6 py-2.5 text-sm font-bold transition-all ${
              isUpdatingPassword || isCooldownActive
                ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white border-red-200 text-red-600 hover:bg-red-50 active:scale-95"
            }`}
          >
            {isCooldownActive && <HugeiconsIcon icon={LockKeyIcon} className="w-4 h-4 mr-2" />}
            {isUpdatingPassword ? "Updating..." : "Update Password"}
          </button>
          {isCooldownActive && (
            <p className="mt-3 text-sm font-medium text-gray-500">
              {availableDateText}
            </p>
          )}
        </div>
      </form>

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
