import React from "react";

export default function RegisterPersonnelForm({ userForm, setUserForm, handleUserSubmit }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full space-y-5">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 font-mono">
        Register District Personnel
      </h2>
      <form onSubmit={handleUserSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Personnel Full Name</label>
          <input 
            type="text" 
            placeholder="e.g., Juan Dela Cruz" 
            value={userForm.name} 
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Official Email Address</label>
          <input 
            type="email" 
            placeholder="username@mdrrmo.gov.ph" 
            value={userForm.email} 
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">System Account Role Scope</label>
          <select 
            value={userForm.role} 
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          >
            <option value="MDRRMO Officer">MDRRMO Communications Officer</option>
            <option value="System Admin">System Administrator</option>
          </select>
        </div>
        <button 
          type="submit" 
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-colors mt-2"
        >
          Create Account Parameters
        </button>
      </form>
    </div>
  );
}
