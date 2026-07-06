import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";

export default function WelcomeModal({ isOpen, onClose, userName, onGoToCatalog }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/60 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-5 top-5 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} className="w-6 h-6" />
            </button>

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <HugeiconsIcon aria-hidden="true" icon={CheckmarkBadge01Icon} className="w-8 h-8" />
            </div>

            <h2 className="text-center text-2xl font-extrabold text-gray-900">
              Successfully Registered!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Welcome to the Disaster Risk Reduction and Management Portal,{" "}
              <span className="font-semibold text-gray-900">{userName}</span>!
              Here is how to get started:
            </p>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mt-8 space-y-6"
            >
              <motion.div variants={itemVariants} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-sm">
                  <span className="text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Browse the Module Catalog</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Click on <span className="font-semibold">Module Catalog</span> in
                    the left sidebar to explore all available DRRM training topics.
                  </p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-sm">
                  <span className="text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Enroll in a Module</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Find a topic that interests you and click{" "}
                    <span className="font-semibold">Enroll</span> to add it to your
                    personal learning queue.
                  </p>
                </div>
              </motion.div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, type: "spring", stiffness: 300 }}
              onClick={onGoToCatalog}
              className="mt-8 w-full rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer"
            >
              Go To Catalog Now
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
