
import Spinner from "../../../../../components/ui/Spinner";

export default function RegisterPersonnelForm({ userForm, setUserForm, handleUserSubmit, onClose, isSubmitting = false }) {
  return (
    <div className="p-6 w-full space-y-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">Add Personnel</h2>
        <button 
          type="button" 
          onClick={onClose} 
          disabled={isSubmitting}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
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
            disabled={isSubmitting}
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-60" 
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
          <input 
            type="email" 
            placeholder="username@mdrrmo.gov.ph" 
            value={userForm.email} 
            disabled={isSubmitting}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-60" 
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Role</label>
          <select 
            value={userForm.role} 
            disabled={isSubmitting}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-60"
          >
            <option value="barangay_admin">Barangay Admin</option>
          </select>
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-colors mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Spinner className="w-4 h-4 text-white" />
              <span>Creating Account...</span>
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>
    </div>
  );
}
