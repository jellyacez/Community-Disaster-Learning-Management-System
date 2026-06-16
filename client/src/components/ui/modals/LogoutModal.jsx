import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Logout01Icon } from "@hugeicons/core-free-icons";

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-5 top-5 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" />
            </button>

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <HugeiconsIcon icon={Logout01Icon} className="w-8 h-8 translate-x-1" />
            </div>

            <h2 className="text-center text-2xl font-extrabold text-gray-900">
              Confirm Logout
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Are you sure you want to log out of your account? You will need to sign in again to access the portal.
            </p>

            <div className="mt-8 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer"
              >
                Logout
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
