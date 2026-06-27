import React from 'react';

export default function LocalizationSettings() {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Localization & Accessibility</h2>
          <p className="text-sm text-gray-500">Customize your viewing experience.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Language Preference</label>
          <select className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20">
            <option value="en">English</option>
            <option value="tl">Tagalog</option>
            <option value="pam">Kapampangan</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">Currently, modules are translated automatically.</p>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Theme</label>
          <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 w-fit">
            <button className="px-4 py-1.5 rounded-lg bg-white shadow-sm border border-gray-200 text-sm font-bold text-gray-900">Light</button>
            <button className="px-4 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:text-gray-900 transition">Dark</button>
            <button className="px-4 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:text-gray-900 transition">System</button>
          </div>
        </div>
      </div>
    </section>
  );
}
