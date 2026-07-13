import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ModuleViewerSidebar from "./ModuleViewerSidebar";
import ModuleViewerContent from "./ModuleViewerContent";
import { MenuIcon } from "./ModuleIcons";

export default function ModulePlayerPreviewModal({
  isOpen,
  onClose,
  moduleForm,
  stagedFlows
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeStepId, setActiveStepId] = useState(null);
  const [currentProgressOrder, setCurrentProgressOrder] = useState(1);

  // Map the local stagedFlows to the schema expected by the Viewer components
  const mockSteps = stagedFlows.map((flow, index) => ({
    id: flow.id,
    step_order: index + 1,
    title: flow.title,
    type: flow.type,
    content: flow.type === "text" ? flow.textContent : flow.situationalScenario,
    media_url: flow.type === "text" ? flow.attachedFileName : flow.attachedImageName
  }));

  // Initialize the first step when the modal opens or stagedFlows changes
  useEffect(() => {
    if (isOpen && mockSteps.length > 0 && !activeStepId) {
      setActiveStepId(mockSteps[0].id);
    }
  }, [isOpen, mockSteps, activeStepId]);

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

  const mockModuleData = {
    title: moduleForm.title || "Untitled Module",
    description: moduleForm.description
  };

  const activeStep = mockSteps.find((s) => s.id === activeStepId);

  // Calculate progress safely based on the mock progress order
  const progressPercentage = Math.round(
    (currentProgressOrder / (mockSteps.length || 1)) * 100
  );

  const handleStepClick = (step) => {
    setActiveStepId(step.id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleNextStep = () => {
    if (!activeStep) return;
    const nextOrder = activeStep.step_order + 1;
    const nextStep = mockSteps.find((s) => s.step_order === nextOrder);
    
    if (nextStep) {
      setActiveStepId(nextStep.id);
      // Advance progress if they moved to a new uncompleted step
      if (nextOrder > currentProgressOrder) {
        setCurrentProgressOrder(nextOrder);
      }
    } else {
      // Complete module logic
      toast.success("Module Preview Completed!");
      onClose();
    }
  };

  const handlePreviousStep = () => {
    if (!activeStep) return;
    const prevOrder = activeStep.step_order - 1;
    const prevStep = mockSteps.find((s) => s.step_order === prevOrder);
    if (prevStep) setActiveStepId(prevStep.id);
  };

  // Mock navigate function since the sidebar uses it to exit
  const mockNavigate = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-gray-50 overflow-hidden">
      
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
          module={mockModuleData}
          steps={mockSteps}
          currentProgressOrder={currentProgressOrder}
          activeStepId={activeStepId}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          handleStepClick={handleStepClick}
          progressPercentage={progressPercentage}
          navigate={mockNavigate}
        />

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          
          {/* Admin Notice Banner */}
          <div className="bg-amber-100 text-amber-800 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm z-[110]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Live Player Preview Mode
            <button onClick={onClose} className="ml-2 bg-amber-900 text-amber-50 px-2 py-0.5 rounded-full hover:bg-amber-950 transition">Close Preview</button>
          </div>

          <ModuleViewerContent 
            activeStep={activeStep}
            totalSteps={mockSteps.length}
            handlePrevious={handlePreviousStep}
            handleCompleteAndContinue={handleNextStep}
            isCompleting={false}
          />
        </div>
      </div>

    </div>
  );
}
