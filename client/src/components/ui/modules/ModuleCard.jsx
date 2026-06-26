import React, { useState, useCallback, useRef, memo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ModuleCard = memo(function ModuleCard({ module, enrolled = false, onEnrollSuccess }) {
  const [localEnrolled, setLocalEnrolled] = useState(enrolled);
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  const isEnrollingRef = useRef(false);

  const handleEnroll = useCallback(async () => {
    if (isEnrollingRef.current) return;
    isEnrollingRef.current = true;
    setIsEnrolling(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/modules/${module.id}/enroll`,
        {},
        { withCredentials: true }
      );
      
      if (response.data.success) {
        toast.success(`Enrollment Success! You are now enrolled in ${module.title}.`);
        setLocalEnrolled(true);
        if (onEnrollSuccess) onEnrollSuccess(module.id);
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      toast.error(error.response?.data?.message || "Failed to enroll in module. Please try again.");
    } finally {
      isEnrollingRef.current = false;
      setIsEnrolling(false);
    }
  }, [module.id, module.title, onEnrollSuccess]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
          {module.category}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
          {module.level}
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          {module.duration}
        </span>
      </div>

      <h2 className="text-xl font-bold text-gray-900">{module.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{module.description}</p>

      {localEnrolled && (
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-gray-500">Progress</span>
            <span className="font-bold text-gray-900">{module.progress || 0}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-red-600 transition-all duration-500 ease-out"
              style={{ width: `${module.progress || 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {localEnrolled ? (
          <button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer">
            Continue
          </button>
        ) : (
          <button 
            onClick={handleEnroll}
            disabled={isEnrolling}
            className={`rounded-xl px-5 py-3 text-sm font-bold text-white transition flex items-center justify-center gap-2 ${
              isEnrolling ? "bg-gray-400 cursor-not-allowed" : "bg-gray-900 hover:bg-black cursor-pointer"
            }`}
          >
            {isEnrolling ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enrolling...
              </>
            ) : (
              "Enroll Now"
            )}
          </button>
        )}

        <button className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer">
          View Details
        </button>
      </div>
    </div>
  );
});

export default ModuleCard;