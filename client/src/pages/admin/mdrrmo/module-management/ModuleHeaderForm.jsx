import { useState } from "react";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";
import RichTextEditor from "../../../../components/ui/RichTextEditor";

export default function ModuleHeaderForm({ editingModuleId, moduleForm, setModuleForm, formErrors = {}, setFormErrors }) {
  const [isUploading, setIsUploading] = useState(false);
  
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Uploading thumbnail...");
    
    try {
      const formData = new FormData();
      formData.append("mediaFile", file);
      
      const res = await apiClient.post("modules/upload-media", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      handleFieldChange('image_url', res.data.url);
      toast.success("Thumbnail uploaded successfully!", { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload image.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Banner / Thumbnail Area */}
      <div className="w-full h-40 max-h-[240px] relative bg-gradient-to-r from-red-500 to-red-700 flex flex-col items-center justify-center p-4 text-center group">
        {moduleForm.image_url ? (
          <img 
            src={moduleForm.image_url} 
            alt="Module Thumbnail" 
            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
          />
        ) : (
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20"></div>
        )}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
        
        {/* Floating Thumbnail Controls */}
        <div className="relative z-10 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg w-full max-w-md mx-auto flex items-center gap-2 transform translate-y-4 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <svg className="w-5 h-5 text-gray-400 ml-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <input 
            type="text" 
            placeholder="Paste URL..." 
            value={moduleForm.image_url || ""} 
            onChange={(e) => handleFieldChange('image_url', e.target.value)} 
            className="flex-1 bg-transparent text-xs font-medium outline-none text-gray-800 placeholder-gray-500 py-1"
          />
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <label className={`cursor-pointer px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isUploading ? (
              <svg className="animate-spin h-3.5 w-3.5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            )}
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
          </label>
        </div>
        {!moduleForm.image_url && <span className="relative z-10 text-white/70 text-sm font-medium mt-2">Hover to add thumbnail image</span>}
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {/* Title Input */}
        <div>
          <input 
            type="text" 
            placeholder="Untitled Learning Path..." 
            value={moduleForm.title} 
            onChange={(e) => handleFieldChange('title', e.target.value)} 
            className={`w-full text-2xl md:text-3xl font-black text-gray-900 bg-transparent placeholder-gray-300 outline-none transition-all ${formErrors.title ? 'border-b-2 border-red-500' : 'border-b-2 border-transparent focus:border-gray-200'} pb-2`} 
          />
          {formErrors.title && <p className="text-red-500 text-sm mt-1 font-bold flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{formErrors.title}</p>}
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              Category
            </label>
            <select 
              value={moduleForm.category} 
              onChange={(e) => handleFieldChange('category', e.target.value)} 
              className="w-full py-2 px-3 bg-gray-50 hover:bg-gray-100 border border-transparent focus:border-red-200 focus:bg-white focus:ring-4 focus:ring-red-500/10 text-gray-900 rounded-lg text-xs font-bold transition-all outline-none cursor-pointer appearance-none"
            >
              <option value="Flooding">Flooding</option>
              <option value="Earthquakes">Earthquakes</option>
              <option value="Fire">Fire</option>
              <option value="General Safety / Protocols">General Safety</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Est. Duration
            </label>
            <select 
              value={moduleForm.duration} 
              onChange={(e) => handleFieldChange('duration', e.target.value)} 
              className="w-full py-2 px-3 bg-gray-50 hover:bg-gray-100 border border-transparent focus:border-red-200 focus:bg-white focus:ring-4 focus:ring-red-500/10 text-gray-900 rounded-lg text-xs font-bold transition-all outline-none cursor-pointer appearance-none"
            >
              <option value="15 mins">15 mins</option>
              <option value="30 mins">30 mins</option>
              <option value="45 mins">45 mins</option>
              <option value="1 hour">1 hour</option>
              <option value="1.5 hours+">1.5 hours+</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              Level
            </label>
            <select 
              value={moduleForm.level} 
              onChange={(e) => handleFieldChange('level', e.target.value)} 
              className="w-full py-2 px-3 bg-gray-50 hover:bg-gray-100 border border-transparent focus:border-red-200 focus:bg-white focus:ring-4 focus:ring-red-500/10 text-gray-900 rounded-lg text-xs font-bold transition-all outline-none cursor-pointer appearance-none"
            >
              <option value="Level 1">Beginner</option>
              <option value="Level 2">Intermediate</option>
              <option value="Level 3">Advanced</option>
            </select>
          </div>
        </div>

        <div className="w-full pt-2">
           <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
              Description / Summary
           </label>
           <div className={`rounded-xl overflow-hidden border transition-all ${formErrors.description ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-200 focus-within:border-gray-300'}`}>
              <RichTextEditor 
                placeholder="Let your learners know a little about this learning path..." 
                value={moduleForm.description} 
                onChange={(content) => handleFieldChange('description', content)} 
                className="min-h-[160px] text-sm border-none"
              />
           </div>
           {formErrors.description && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{formErrors.description}</p>}
        </div>
      </div>
    </div>
  );
}