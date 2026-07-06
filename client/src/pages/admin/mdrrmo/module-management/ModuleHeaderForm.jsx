
export default function ModuleHeaderForm({ editingModuleId, moduleForm, setModuleForm }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2 font-mono">
        {editingModuleId ? "Modify Training Module" : "Setup New Training Module"}
      </h2>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Module Topic Title</label>
        <input 
          type="text" 
          placeholder="e.g., Protocol for Flash Floods" 
          value={moduleForm.title} 
          onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} 
          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Short Description / Summary</label>
        <textarea 
          rows="2" 
          placeholder="Brief summary of scopes..." 
          value={moduleForm.description} 
          onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} 
          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none" 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Risk Level</label>
          <select 
            value={moduleForm.riskLevel} 
            onChange={(e) => setModuleForm({ ...moduleForm, riskLevel: e.target.value })} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          >
            <option value="Low">Low Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Urgency</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Visibility State</label>
          <select 
            value={moduleForm.status} 
            onChange={(e) => setModuleForm({ ...moduleForm, status: e.target.value })} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          >
            <option value="Public">Public</option>
            <option value="Private">Private Draft</option>
          </select>
        </div>
      </div>
    </div>
  );
}
