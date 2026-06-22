import React, { useState } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import { BACOLOR_BARANGAYS } from "../../../constants/locations";

export default function OnboardingModal({ currentUser }) {
  const [onboardingName, setOnboardingName] = useState(currentUser?.name || "");
  const [onboardingBarangay, setOnboardingBarangay] = useState("");
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);

  // If user does not need onboarding, return null so it doesn't render
  if (currentUser?.barangay !== "Unassigned") return null;

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!onboardingName.trim()) {
      toast.error("Please enter your Full Name");
      return;
    }
    if (!onboardingBarangay) {
      toast.error("Please select a Barangay to continue");
      return;
    }

    setIsSubmittingOnboarding(true);
    try {
      const res = await fetch("http://localhost:5000/api/users/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: onboardingName, barangay: onboardingBarangay }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update profile");
      
      toast.success("Profile completed successfully!");
      // Force reload to update currentUser context
      window.location.reload();
    } catch (err) {
      toast.error(err.message);
      setIsSubmittingOnboarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
        
        <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
          <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-8 h-8 text-red-600" />
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-2">Welcome to Bacolor DRRM!</h2>
        <p className="text-gray-500 mb-6">
          Since you signed in with Google, we just need one more piece of information before you can access your dashboard.
        </p>

        <form onSubmit={handleOnboardingSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={onboardingName}
              onChange={(e) => setOnboardingName(e.target.value)}
              placeholder="Confirm your full name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Which Barangay do you live in?
            </label>
            <select
              value={onboardingBarangay}
              onChange={(e) => setOnboardingBarangay(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition"
            >
              <option value="" disabled>Select your Barangay</option>
              {BACOLOR_BARANGAYS.map((brgy) => (
                <option key={brgy} value={brgy}>{brgy}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmittingOnboarding}
            className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition disabled:opacity-50"
          >
            {isSubmittingOnboarding ? "Saving..." : "Complete Profile"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
