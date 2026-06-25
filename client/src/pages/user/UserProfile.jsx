// --- START: UserProfile.jsx ---
import React from "react";
import { useOutletContext } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function UserProfile() {
  useDocumentTitle("User Profile | Bacolor LMS");

  const { currentUser, userInitials } = useOutletContext();

  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            User Profile
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View your account information and learning identity.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-red-100 text-3xl font-extrabold text-red-700">
                {currentUser?.image ?(
                  <img
                  src={currentUser.image}
                  alt="User profile"
                   className="h-full w-full object-cover"
                  />
                ):(
                  userInitials
                )}
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <span className="text-xs font-semibold text-white">Change</span>
                  <input type="file" className="hidden" accept="image/*" />
                </label>
              </div>
              <h2 className="mt-4 text-xl font-bold text-gray-900">
                {currentUser.name}
              </h2>
              <p className="text-sm text-gray-500">{currentUser.role}</p>
              <label className="mt-4 cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                Change Picture
                <input type="file" className="hidden" accept="image/*" />
              </label>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Account Details</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Full Name
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {currentUser.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Email
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {currentUser.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Barangay
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {currentUser.barangay}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Role
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {currentUser.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// --- END: UserProfile.jsx ---
