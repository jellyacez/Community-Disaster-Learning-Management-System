import React from "react";
import { useOutletContext } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification03Icon } from "@hugeicons/core-free-icons";
import StatCard from "./components/StatCard.jsx";
import { announcements, modules } from "./userData.js";

export default function UserDashboard() {
  const { currentUser } = useOutletContext();
  const enrolledModules = modules.filter((module) => module.enrolled);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-8">
        <section className="rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600 p-8 text-white shadow-lg">
          <p className="text-sm uppercase tracking-widest text-red-100">
            Welcome back
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-extrabold">
            Hello, {currentUser.name}
          </h1>
          <p className="mt-3 max-w-2xl text-red-100">
            Continue your disaster preparedness training, stay updated with
            municipal announcements, and track your learning progress in one
            place.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-50 transition cursor-pointer">
              Browse Modules
            </button>
            <button className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition cursor-pointer">
              Continue Learning
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Available Modules"
            value={modules.length}
            subtitle="Training modules ready for access"
          />
          <StatCard
            title="Enrolled Modules"
            value={enrolledModules.length}
            subtitle="Modules currently in progress"
          />
          <StatCard
            title="Announcements"
            value={announcements.length}
            subtitle="Latest updates from the system"
          />
          <StatCard
            title="Completion Rate"
            value="54%"
            subtitle="Overall learning progress estimate"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Continue Your Modules
                </h2>
                <p className="text-sm text-gray-500">
                  Resume training where you left off.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {enrolledModules.map((module) => (
                <div
                  key={module.id}
                  className="rounded-2xl border border-gray-200 p-5 hover:border-red-200 transition cursor-pointer"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                          {module.category}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {module.level}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {module.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {module.description}
                      </p>
                    </div>

                    <div className="min-w-52">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-500">
                          Progress
                        </span>
                        <span className="font-bold text-gray-900">
                          {module.progress}%
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-red-600"
                          style={{ width: `${module.progress}%` }}
                        />
                      </div>
                      <button className="mt-4 w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer">
                        Resume Module
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <HugeiconsIcon
                icon={Notification03Icon}
                className="w-5 h-5 text-red-600"
              />
              <h2 className="text-xl font-bold text-gray-900">
                Latest Announcements
              </h2>
            </div>

            <div className="space-y-4">
              {announcements.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-gray-50 p-4 hover:bg-gray-100 transition cursor-pointer border border-transparent hover:border-gray-200"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    {item.date}
                  </p>
                  <h3 className="mt-2 text-sm font-bold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
