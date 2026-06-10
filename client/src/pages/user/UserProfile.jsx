import React from "react";
import { useOutletContext } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

export default function UserProfile() {
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
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-3xl font-extrabold text-red-700">
                {userInitials}
              </div>
              <h2 className="mt-4 text-xl font-bold text-gray-900">
                {currentUser.name}
              </h2>
              <p className="text-sm text-gray-500">{currentUser.role}</p>
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
