import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

const DEFAULT_BACOLOR_BARANGAYS = [
  { id: 1, name: "Balas" },
  { id: 2, name: "Cabalantian" },
  { id: 3, name: "Cabambangan" },
  { id: 4, name: "Cabetican" },
  { id: 5, name: "Calibutbut" },
  { id: 6, name: "Concepcion" },
  { id: 7, name: "Dolores" },
  { id: 8, name: "Duat" },
  { id: 9, name: "Macabacle" },
  { id: 10, name: "Magliman" },
  { id: 11, name: "Maliwalu" },
  { id: 12, name: "Mesalipit" },
  { id: 13, name: "Paralayunan" },
  { id: 14, name: "Potrero" },
  { id: 15, name: "San Antonio" },
  { id: 16, name: "San Isidro" },
  { id: 17, name: "San Vicente" },
  { id: 18, name: "Santa Barbara" },
  { id: 19, name: "Santa Ines" },
  { id: 20, name: "Talba" },
  { id: 21, name: "Tinajero" }
];

export default function OnboardingModal({ currentUser }) {
  const queryClient = useQueryClient();
  const [onboardingName, setOnboardingName] = useState(currentUser?.name || "");
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: barangays = DEFAULT_BACOLOR_BARANGAYS, isLoading } = useQuery({
    queryKey: ["barangays"],
    queryFn: async () => {
      const res = await apiClient.get("/public/barangays");
      return res.data;
    },
    select: (data) => {
      const list = Array.isArray(data) ? data : data?.data || data?.barangays || [];
      if (!list.length) return DEFAULT_BACOLOR_BARANGAYS;
      return list.map((b, idx) => {
        if (typeof b === "string") {
          return { id: idx + 1, name: b.trim() };
        }
        return {
          id: b.id ?? b.barangay_id ?? idx + 1,
          name: (b.name || b.barangay_name || "").trim()
        };
      });
    },
    enabled: !isSuccess && !!currentUser && (!currentUser.name || !currentUser.barangay_id)
  });

  if (isSuccess || !currentUser || (currentUser.name && currentUser.barangay_id)) return null;

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!onboardingName.trim()) {
      toast.error("Please enter your Full Name");
      return;
    }
    if (!selectedBarangay) {
      toast.error("Please select a Barangay to continue");
      return;
    }

    setIsSubmittingOnboarding(true);
    try {
      // Sends all expected shape variations (name, barangay_id, barangayId)
      await apiClient.post("/users/onboarding", {
        name: onboardingName.trim(),
        barangay: selectedBarangay.name,
        barangay_id: selectedBarangay.id,
        barangayId: selectedBarangay.id
      });

      toast.success("Profile completed successfully!");
      setIsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to update profile"
      );
      setIsSubmittingOnboarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-3xl shadow-2xl p-8 max-w-md w-full relative border-t-[8px] border-t-red-600"
      >
        <div className="h-16 w-16 bg-red-50 dark:bg-red-950/60 rounded-2xl flex items-center justify-center mb-6">
          <HugeiconsIcon aria-hidden="true" icon={CheckmarkBadge01Icon} className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>

        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Welcome to Bacolor DRRM!</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-6">
          Since you signed in with Google, we just need one more piece of information before you can access your dashboard.
        </p>

        <form onSubmit={handleOnboardingSubmit} className="space-y-4">
          <div>
            <label htmlFor="onboardingName" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              Full Name
            </label>
            <input
              id="onboardingName"
              name="onboardingName"
              type="text"
              value={onboardingName}
              onChange={(e) => setOnboardingName(e.target.value)}
              placeholder="Confirm your full name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 outline-none transition"
            />
          </div>

          <div className="relative">
            <label htmlFor="onboardingBarangay" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              Which Barangay do you live in?
            </label>
            <div className="relative">
              <button
                type="button"
                id="onboardingBarangay"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left focus:ring-2 focus:ring-red-500 outline-none transition flex items-center justify-between cursor-pointer"
              >
                <span className={selectedBarangay ? "text-gray-900 dark:text-slate-100 font-medium" : "text-gray-400 dark:text-slate-500"}>
                  {selectedBarangay ? selectedBarangay.name : "Select your Barangay"}
                </span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  className={`w-5 h-5 text-gray-400 dark:text-slate-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 z-50 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto"
                  >
                    {isLoading ? (
                      <div className="px-4 py-3 text-gray-500 dark:text-slate-400 text-sm">Loading barangays...</div>
                    ) : barangays.length === 0 ? (
                      <div className="px-4 py-3 text-gray-400 dark:text-slate-400 text-sm">No barangays found</div>
                    ) : (
                      barangays.map((brgy) => (
                        <button
                          key={brgy.id || brgy.name}
                          type="button"
                          onClick={() => {
                            setSelectedBarangay(brgy);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 transition-colors text-sm cursor-pointer ${
                            selectedBarangay?.id === brgy.id || selectedBarangay?.name === brgy.name
                              ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-semibold"
                              : "text-gray-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          {brgy.name}
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingOnboarding}
            className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition disabled:opacity-50 mt-2"
          >
            {isSubmittingOnboarding ? "Saving..." : "Complete Profile"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}