import RichTextEditor from "../../../../components/ui/RichTextEditor";

export default function ModuleHeaderForm({ editingModuleId, moduleForm, setModuleForm, formErrors = {}, setFormErrors }) {
  
  const handleFieldChange = (field, value) => {
    setModuleForm({ ...moduleForm, [field]: value });
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-4">
        {editingModuleId ? "Modify Training Module" : "Setup New Training Module"}
      </h2>
      
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
          Module Topic Title <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input 
          type="text" 
          placeholder="e.g., Protocol for Flash Floods" 
          value={moduleForm.title} 
          onChange={(e) => handleFieldChange('title', e.target.value)} 
          className={`w-full p-3 bg-white border ${formErrors.title ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'} rounded-xl text-sm font-medium transition-all outline-none`} 
        />
        {formErrors.title && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.title}</p>}
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
          Thumbnail Image URL (Optional)
        </label>
        <input 
          type="text" 
          placeholder="e.g., https://example.com/flood-image.jpg" 
          value={moduleForm.image_url || ""} 
          onChange={(e) => handleFieldChange('image_url', e.target.value)} 
          className="w-full p-3 bg-white border border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl text-sm font-medium transition-all outline-none" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Disaster Category</label>
          <select 
            value={moduleForm.category} 
            onChange={(e) => handleFieldChange('category', e.target.value)} 
            className="w-full p-3 bg-white border border-slate-300 text-slate-800 rounded-xl text-sm font-bold transition-all outline-none cursor-pointer focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          >
            <option value="Flooding">Flooding</option>
            <option value="Earthquakes">Earthquakes</option>
            <option value="Fire">Fire</option>
            <option value="General Safety / Protocols">General Safety / Protocols</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Competency Level</label>
          <select 
            value={moduleForm.level} 
            onChange={(e) => handleFieldChange('level', e.target.value)} 
            className="w-full p-3 bg-white border border-slate-300 text-slate-800 rounded-xl text-sm font-bold transition-all outline-none cursor-pointer focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          >
            <option value="Level 1">Level 1: Beginner</option>
            <option value="Level 2">Level 2: Intermediate</option>
            <option value="Level 3">Level 3: Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Estimated Duration</label>
          <select 
            value={moduleForm.duration} 
            onChange={(e) => handleFieldChange('duration', e.target.value)} 
            className="w-full p-3 bg-white border border-slate-300 text-slate-800 rounded-xl text-sm font-bold transition-all outline-none cursor-pointer focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          >
            <option value="15 mins">15 mins</option>
            <option value="30 mins">30 mins</option>
            <option value="45 mins">45 mins</option>
            <option value="1 hour">1 hour</option>
            <option value="1.5 hours+">1.5 hours+</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
          Short Description / Summary <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <div className="text-sm">
          <RichTextEditor 
            placeholder="Brief summary of scopes..." 
            value={moduleForm.description} 
            onChange={(content) => handleFieldChange('description', content)} 
            className={`min-h-[140px] text-sm border ${formErrors.description ? 'border-red-500' : 'border-gray-300'}`}
          />
        </div>
        {formErrors.description && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.description}</p>}
      </div>
    </div>
  );
}