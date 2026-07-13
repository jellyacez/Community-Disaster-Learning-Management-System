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
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-3">
        {editingModuleId ? "Modify Training Module" : "Setup New Training Module"}
      </h2>
      
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Module Topic Title <span className="text-red-500">*</span></label>
        <input 
          type="text" 
          placeholder="e.g., Protocol for Flash Floods" 
          value={moduleForm.title} 
          onChange={(e) => handleFieldChange('title', e.target.value)} 
          className={`w-full p-2.5 bg-gray-50 border ${formErrors.title ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`} 
        />
        {formErrors.title && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.title}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Thumbnail Image URL (Optional)</label>
        <input 
          type="text" 
          placeholder="e.g., https://example.com/flood-image.jpg" 
          value={moduleForm.image_url || ""} 
          onChange={(e) => handleFieldChange('image_url', e.target.value)} 
          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Disaster Category</label>
          <select 
            value={moduleForm.category} 
            onChange={(e) => handleFieldChange('category', e.target.value)} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          >
            <option value="Flooding">Flooding</option>
            <option value="Earthquakes">Earthquakes</option>
            <option value="Fire">Fire</option>
            <option value="General Safety / Protocols">General Safety / Protocols</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Competency Level</label>
          <select 
            value={moduleForm.level} 
            onChange={(e) => handleFieldChange('level', e.target.value)} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          >
            <option value="Level 1">Level 1: Beginner</option>
            <option value="Level 2">Level 2: Intermediate</option>
            <option value="Level 3">Level 3: Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Estimated Duration</label>
          <select 
            value={moduleForm.duration} 
            onChange={(e) => handleFieldChange('duration', e.target.value)} 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
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
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Short Description / Summary <span className="text-red-500">*</span></label>
        <RichTextEditor 
          placeholder="Brief summary of scopes..." 
          value={moduleForm.description} 
          onChange={(content) => handleFieldChange('description', content)} 
          className={`min-h-[120px] ${formErrors.description ? 'border-red-500' : ''}`}
        />
        {formErrors.description && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.description}</p>}
      </div>
    </div>
  );
}
