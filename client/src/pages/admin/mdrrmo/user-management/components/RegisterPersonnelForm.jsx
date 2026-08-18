
export default function RegisterPersonnelForm({ userForm, setUserForm, handleUserSubmit, onClose }) {
  return (
    <div className="p-6 w-full space-y-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">Add Personnel</h2>
        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <form onSubmit={handleUserSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
          <input 
            type="text" 
            placeholder="e.g., Juan Dela Cruz" 
            value={userForm.name} 
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
          <input 
            type="email" 
            placeholder="username@mdrrmo.gov.ph" 
            value={userForm.email} 
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Role</label>
          <select 
            value={userForm.role} 
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          >
            <option value="barangay_admin">Barangay Admin</option>
          </select>
        </div>
        <button 
          type="submit" 
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-colors mt-2"
        >
          Create Account
        </button>
      </form>
    </div>
  );
}
