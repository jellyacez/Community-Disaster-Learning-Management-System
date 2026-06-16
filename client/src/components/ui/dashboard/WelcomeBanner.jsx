import React from "react";

export default function WelcomeBanner({ userName, onBrowse, onContinue }) {
  return (
    <section className="rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600 p-8 text-white shadow-lg">
      <p className="text-sm uppercase tracking-widest text-red-100">
        Welcome back
      </p>
      <h1 className="mt-2 text-3xl md:text-4xl font-extrabold">
        Hello, {userName}
      </h1>
      <p className="mt-3 max-w-2xl text-red-100">
        Continue your disaster preparedness training, stay updated with
        municipal announcements, and track your learning progress in one
        place.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onBrowse}
          className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-50 transition cursor-pointer"
        >
          Browse Modules
        </button>
        <button
          onClick={onContinue}
          className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition cursor-pointer"
        >
          Continue Learning
        </button>
      </div>
    </section>
  );
}
