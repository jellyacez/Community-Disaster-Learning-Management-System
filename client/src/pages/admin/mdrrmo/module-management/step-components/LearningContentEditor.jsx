import RichTextEditor from "../../../../../components/ui/RichTextEditor";
import toast from "react-hot-toast";

export default function LearningContentEditor({
  currentFlowStep,
  handleFieldChange,
  formErrors,
  writtenMaterialFile,
  setWrittenMaterialFile
}) {
  return (
    <div className="p-5 bg-slate-50 border border-slate-200 border-dashed rounded-xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 1. Learning Content Instructions */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">1. Learning Content Instructions</h4>
        <div className="text-sm bg-white rounded-xl shadow-sm">
          <RichTextEditor 
            placeholder="Type detailed learning steps or instructional summary text..." 
            value={currentFlowStep.textContent} 
            onChange={(content) => handleFieldChange('textContent', content)} 
            className={`min-h-[140px] text-sm border ${formErrors.stepContent ? 'border-red-500' : 'border-slate-300'}`}
          />
        </div>
        {formErrors.stepContent && <p className="text-red-500 text-xs mt-1.5 font-bold">{formErrors.stepContent}</p>}
      </div>

      {/* 2. Media & Document Upload */}
      <div className="space-y-2 border-t border-slate-200 pt-5">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">2. Media & Document Upload</h4>
        <div className="flex flex-col gap-2.5 bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            Select Reference File (Video, PDF, DOCX)
          </span>
          <input 
            type="file" 
            accept=".pdf, .docx, video/mp4, video/webm, video/ogg" 
            onChange={(e) => {
              const targetFile = e.target.files[0];
              if (targetFile) {
                setWrittenMaterialFile(targetFile);
                toast.success(`Media staged: ${targetFile.name}`);
              }
            }}
            className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer transition-colors" 
          />
          {writtenMaterialFile && (
            <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs text-emerald-800 font-bold">Staged File: {writtenMaterialFile.name}</p>
              {writtenMaterialFile.type.startsWith("video/") && (
                <video 
                  controls 
                  preload="metadata" 
                  className="w-full max-h-64 object-cover rounded-xl border border-slate-200 mt-2 shadow-sm"
                  src={URL.createObjectURL(writtenMaterialFile)}
                />
              )}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
