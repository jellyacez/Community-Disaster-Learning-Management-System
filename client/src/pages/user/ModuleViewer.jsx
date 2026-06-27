import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import toast from "react-hot-toast";

import { MenuIcon } from "../../components/ui/modules/viewer/ModuleIcons";
import ModuleViewerSidebar from "../../components/ui/modules/viewer/ModuleViewerSidebar";
import ModuleViewerContent from "../../components/ui/modules/viewer/ModuleViewerContent";

// MOCK DATA (Fallback until backend endpoint is fully ready)
const MOCK_MODULE = {
  id: "m1",
  title: "Flood Preparedness & Survival",
  category: "Flood",
};

const MOCK_STEPS = [
  { id: "s1", step_order: 1, type: "video", title: "Introduction to Flood Risks", content: "Understanding the geographical risks of Bacolor during monsoon season. In this video, we cover the basics of flood formation and historical data." },
  { id: "s2", step_order: 2, type: "text", title: "Emergency Kit Essentials", content: "What to pack in your 72-hour survival bag. Ensure you have water, non-perishable food, batteries, and first-aid supplies." },
  { id: "s3", step_order: 3, type: "quiz", title: "Knowledge Check: Evacuation Routes", content: "Please complete the interactive map quiz to verify you know your designated evacuation center." },
  { id: "s4", step_order: 4, type: "video", title: "Post-Flood Sanitation", content: "How to safely clean up after the water recedes. Avoid contaminated water and use protective gear." },
  { id: "s5", step_order: 5, type: "text", title: "Final Assessment", content: "Complete this final assessment to earn your Flood Preparedness Badge." },
];

export default function ModuleViewer() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  useDocumentTitle(`${MOCK_MODULE.title} | Bacolor LMS`);

  // State Management
  const [currentProgressOrder, setCurrentProgressOrder] = useState(0);
  const [activeStepId, setActiveStepId] = useState(MOCK_STEPS[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeStep = useMemo(() => MOCK_STEPS.find(s => s.id === activeStepId), [activeStepId]);
  const progressPercentage = Math.round((currentProgressOrder / MOCK_STEPS.length) * 100);

  const handleStepClick = (step) => {
    const isCompleted = step.step_order <= currentProgressOrder;
    const isNextAvailable = step.step_order === currentProgressOrder + 1;

    if (isCompleted || isNextAvailable) {
      setActiveStepId(step.id);
      setIsSidebarOpen(false);
    } else {
      toast.error("Please complete previous steps first to unlock this lesson.", { id: "lock-toast" });
    }
  };

  const handleCompleteAndContinue = () => {
    if (!activeStep) return;
    
    if (activeStep.step_order > currentProgressOrder) {
      setCurrentProgressOrder(activeStep.step_order);
      toast.success("Step completed!");
    }

    const nextStep = MOCK_STEPS.find(s => s.step_order === activeStep.step_order + 1);
    if (nextStep) {
      setActiveStepId(nextStep.id);
    } else {
      toast.success("Congratulations! You have completed the entire module!", { duration: 5000 });
      navigate("/userDashboard");
    }
  };

  const handlePrevious = () => {
    if (!activeStep) return;
    const prevStep = MOCK_STEPS.find(s => s.step_order === activeStep.step_order - 1);
    if (prevStep) {
      setActiveStepId(prevStep.id);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col md:flex-row">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4 sticky top-0 z-20 shadow-sm">
        <button onClick={() => navigate("/userDashboard")} className="text-gray-500 hover:text-gray-900 transition flex items-center gap-2 text-sm font-semibold">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition">
          <MenuIcon />
        </button>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <ModuleViewerSidebar 
        module={MOCK_MODULE}
        steps={MOCK_STEPS}
        currentProgressOrder={currentProgressOrder}
        activeStepId={activeStepId}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleStepClick={handleStepClick}
        progressPercentage={progressPercentage}
        navigate={navigate}
      />

      <ModuleViewerContent 
        activeStep={activeStep}
        totalSteps={MOCK_STEPS.length}
        handlePrevious={handlePrevious}
        handleCompleteAndContinue={handleCompleteAndContinue}
      />

    </div>
  );
}
