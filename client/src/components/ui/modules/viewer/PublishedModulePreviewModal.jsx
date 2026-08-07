import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../../../lib/apiClient";
import ModuleViewerSidebar from "./ModuleViewerSidebar";
import ModuleViewerContent from "./ModuleViewerContent";
import { MenuIcon } from "./ModuleIcons";
import Spinner from "../../Spinner";

export default function PublishedModulePreviewModal({
  isOpen,
  onClose,
  moduleId
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeStepId, setActiveStepId] = useState(null);
  
  // Local state to track progress safely without mutating backend
  const [localCompletedStepIds, setLocalCompletedStepIds] = useState([]);

  // Fetch published module data
  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminModulePreview', moduleId],
    queryFn: async () => {
      const response = await apiClient.get(`/modules/${moduleId}/viewer`);
      return response.data.data;
    },
    enabled: isOpen && !!moduleId,
    retry: 1
  });

  const levels = data?.levels;
  const module = data?.module;

  const allSteps = useMemo(() => {
    return levels ? levels.reduce((acc, lvl) => [...acc, ...(lvl.steps || [])], []) : [];
  }, [levels]);

  const activeStep = allSteps.find((s) => s.id === activeStepId);

  const isAssessmentStepType = (type) => {
    return ['quiz', 'situational', 'priority_action', 'hazard_identification', 'action_sequence'].includes(type);
  };

  const assessmentQueries = useQueries({
    queries: allSteps.map(step => ({
      queryKey: ['stepAssessmentPreview', step.id],
      queryFn: async () => {
        const res = await apiClient.get(`/modules/steps/${step.id}/assessment`);
        return { stepId: step.id, questions: res.data.data };
      },
      enabled: step.id === activeStepId && isAssessmentStepType(step.type) && isOpen,
      staleTime: Infinity,
    }))
  });

  const getAssessmentForStep = (stepId) => {
    const query = assessmentQueries.find(q => String(q.data?.stepId) === String(stepId));
    return {
      questions: query?.data?.questions || [],
      isLoading: query?.isLoading || (query?.isFetching && query?.status === 'pending')
    };
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex bg-gray-50 items-center justify-center flex-col">
         <Spinner className="w-12 h-12 text-red-600 mb-4" />
         <p className="text-gray-500 font-bold animate-pulse">Loading preview module data...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="fixed inset-0 z-[100] flex bg-gray-50 items-center justify-center">
         <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-red-100 max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Preview Unavailable</h2>
            <p className="text-gray-500 mb-6 text-sm">Failed to fetch module data for preview.</p>
            <button onClick={onClose} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition">Close Preview</button>
         </div>
      </div>
    );
  }

  const handleStepClick = (step) => {
    setActiveStepId(step?.id || null);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleNextStep = () => {
    if (!activeStep) return;
    
    // Mark current as completed in local state
    setLocalCompletedStepIds(prev => Array.from(new Set([...prev, activeStep.id])));

    // Find next uncompleted step in sequence
    const currentIndex = allSteps.findIndex(s => s.id === activeStep.id);
    const nextStep = allSteps[currentIndex + 1];
    
    if (nextStep) {
      setActiveStepId(nextStep.id);
    } else {
      toast.success("Module Preview Completed!");
      onClose();
    }
  };

  const handlePreviousStep = () => {
    if (!activeStep) return;
    const currentIndex = allSteps.findIndex(s => s.id === activeStep.id);
    const prevStep = allSteps[currentIndex - 1];
    if (prevStep) setActiveStepId(prevStep.id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-gray-50 overflow-hidden text-left">
      
      {/* Mobile Header */}
      <div className="md:hidden absolute top-0 left-0 right-0 flex items-center justify-between bg-white border-b border-gray-200 p-4 z-[120] shadow-sm">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition flex items-center gap-2 text-sm font-semibold">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Exit Preview
        </button>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition">
          <MenuIcon />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[110] md:hidden animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Layout Area */}
      <div className="flex w-full h-full pt-[68px] md:pt-0 relative z-[115]">
        <ModuleViewerSidebar 
          module={module}
          levels={levels}
          completedStepIds={localCompletedStepIds}
          activeStepId={activeStepId}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          handleStepClick={handleStepClick}
          navigate={onClose}
          isPreviewMode={true}
        />

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          
          {/* Admin Notice Banner */}
          <div className="bg-amber-100 text-amber-800 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm z-[110]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Live Player Preview Mode (Read-Only)
            <button onClick={onClose} className="ml-2 bg-amber-900 text-amber-50 px-2 py-0.5 rounded-full hover:bg-amber-950 transition">Close Preview</button>
          </div>

          <ModuleViewerContent 
            levels={levels}
            completedStepIds={localCompletedStepIds}
            handleStepClick={handleStepClick}
            activeStep={activeStep}
            totalSteps={allSteps?.length || 0}
            handlePrevious={handlePreviousStep}
            handleCompleteAndContinue={handleNextStep}
            isCompleting={false}
            getAssessmentForStep={getAssessmentForStep}
            loopBackData={null}
            acknowledgeLoopBack={() => {}}
            isPreviewMode={true}
          />
        </div>
      </div>
    </div>
  );
}
