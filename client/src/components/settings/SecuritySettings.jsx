import React, { useState } from "react";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import PasswordInput from "../ui/inputs/PasswordInput";
import ConfirmationModal from "../ui/modals/ConfirmationModal";

export default function SecuritySettings() {
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
      setPasswordData({ currentPassword: "", newPassword: "" });
      setShowSuccessModal(true);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Security</h2>
        <p className="text-sm text-gray-500 mb-4">
          Change your password to keep your account secure.
        </p>

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

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className={`rounded-xl border px-5 py-3 text-sm font-bold transition-colors ${
              isUpdatingPassword
                ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {isUpdatingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
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
